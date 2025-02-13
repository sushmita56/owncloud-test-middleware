## oc Test middleware service

This is a middleware server for testing owncloud (owncloud10 or OCIS) with different Clients. This server handles the operations which are required to "get the server to a certain state"

### How it works
Since most tests in owncloud are written in gherkin, the middleware server accepts a gherkin step, parses it and runs the appropriate code to get the server to a certain state.

For example, If we want to run a gherkin step `Given user "Alice" has been created with default attributes`, the test runner sends this step to the middleware server which runs it and creates the user on the oc server with all necessary default attributes (displayname, email etc.) and also stores the user so that we can cleanup after the test is complete.

### Endpoints
- POST /init
    
    reset the middleware state and start a test scenario execution
    ```
    curl -XPOST http://localhost:3000/init
    ```

- POST /execute

    execute a gherkin step
    ```
    curl -XPOST http://localhost:3000/execute -d '{"step": "Given user \"Alice\" has been created with default attributes and without skeleton files"}' -H "Content-Type: application/json"
    ```

    Gherkin data tables are passed as a simple 2D array in json
    ```
    curl -XPOST http://localhost:3000/execute -d '{"step":"Given these groups have been created:","table":[["groupname"],["HelloGroup"]]}' -H 'Content-Type: application/json'
    ```

- GET /state

    retrieve current state of the test runner.
    information like created users/groups list are shared
    ```shell script
      curl http://localhost:3000/state
    ```


- POST /cleanup

    cleanup the middleware state and the owncloud server
    ```
    curl -XPOST http://localhost:3000/cleanup
    ```

### Integration with test frameworks
The middleware service is designed to be used with gherkin test runners such as cucumber and behat. In order to integrate this service with the test suite, we need to find a way to capture the steps that need to be run in the middleware. Most test runners allow use of regex in the matching of the step definition. We can use any regex rule to match all the steps that need to run in the middleware. you can capture them at once and send them to the middleware service.
for example, for all the steps you want to run in the middleware end them with `in the server`, then you can use regex `/^(.*) in the server$/` to capture all the steps

eg. Cucumber Integration

```gherkin
# test.feature
Feature: test feature

  Background:
    Given user "Alice" has been created with default attributes in the server
    And user "Alice" has created folder "new folder" in the server
  
  Scenario: ...
```

```js
// someContext.js
function handler(statement) {
    return fetch("http://localhost:3000/execute", {
        method: "POST",
        body: JSON.stringify({step: "Given " + statement}),
        headers: {
            'Content-Type': 'application/json'
        },
    }).then(res => {
        if (res.ok) {
            // somewhere in the middle of init and cleanup
            if(currentStateIsToBeFetched) {
              return fetch("http://localhost:3000/state").then(res => {
                return res.json()
              })
            }
            return res.text()
        } else {
            throw new Error(res.text())
        }
    }).catch(err => {
        console.error(err)
        return Promise.reject(err)
    })
}

Before(function() {
    return fetch("http://localhost:3000/init", {
        method: "POST"
    })
})

After(function() {
    return fetch("http://localhost:3000/cleanup", {
        method: "POST"
    })
})

Given(/^(.*) in the server$/, handler);
```

**notes**
- You will need to create a separate matcher if you want to send data tables because cucumber will not match the same step with an optional datatable.
- Since most of the test runner state such as the list of users created by the test runner are stored in the middleware, there is no need to remember them in the test runner itself.

### Config
#### Server requirements:
- `testing` app must be enabled to use steps that run `occ` commands or set ownCloud 10 system settings (see [testing/README.md](https://github.com/owncloud/testing/blob/master/README.md))

Note: the `testing` app is not available on oCIS. When such steps are used against an oCIS server they will not be effective.

#### Server specific config variables

| setting | meaning | default |
|-|-|-|
| `HOST` | Host for the middleware server | localhost |
| `PORT` | Port for the middleware server | 3000 |

#### Test Specific config variables

| setting | meaning | default |
|-|-|-|
| `BACKEND_HOST`      | ownCloud server URL (or reva service url for running with OCIS) | http://localhost:8080 |
| `BACKEND_USERNAME` | ownCloud administrator username | admin                 |
| `BACKEND_PASSWORD` | ownCloud administrator password  | admin                 |
| `REMOTE_BACKEND_HOST` | ownCloud remote server URL | http://localhost:8080 |
| `RUN_ON_OCIS` | Running the tests using the OCIS backend | false |
| `OCIS_REVA_DATA_ROOT` | Data directory of OCIS  | /var/tmp/reva |
| `OCIS_SKELETON_DIR` | Skeleton files directory for new users | - |

#### Ldap Specific config variables
| setting | meaning | default |
| -- | -- | -- |
| `RUN_WITH_LDAP` | use LDAP user backend | false |
| `LDAP_SERVER_URL`  | Url of the ldap server | ldap://127.0.0.1 |
| `LDAP_ADMIN_PASSWORD`  | admin password of the ldap server | admin |
| `LDAP_BASE_DN` | base DN of the admin server | cn=admin,dc=owncloud,dc=com |

### Starting the server
To start the middleware server change into the checkout directory of owncloud-test-middleware and use the following commands
```
yarn install  # install dependencies from package.json
yarn start
```
This command assumes that your backend server is running on `http://localhost:8080/` for oc10 (or `https://localhost:9200` when `RUN_WITH_OCIS` is set). If your backend is running on a different address use:
```
BACKEND_HOST=http://localhost/owncloud-server yarn start
```
