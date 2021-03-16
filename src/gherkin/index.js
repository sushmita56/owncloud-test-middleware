const Token = Object.freeze({
  GIVEN: "GIVEN",
  WHEN: "WHEN",
  THEN: "THEN",
});

class StepDef {
  constructor(token, pattern, action) {
    if (typeof action !== "function") {
      throw new Error("not function type");
    }
    this.token = token;
    this.pattern = pattern;
    this.action = action;
  }

  match(step) {
    if (step.token !== this.token) {
      return false;
    }

    if (step.pattern === this.pattern) {
      let datalen = step.data.length;
      if (step.table) {
        datalen += 1;
      }

      if (datalen !== this.action.length) {
        return false;
      }
      return true;
    }
    return false;
  }

  run() {
    if (arguments.length !== this.action.length) {
      throw new Error("Cannot run step with invalid num of args");
    }

    return this.action(...arguments);
  }
}

class TestContext {
  constructor() {
    this.steps = [];
    this.afterSteps = [];
    this.beforeSteps = [];
  }

  addstep(token, pattern, action) {
    if (typeof action !== "function") {
      throw new Error("not function type");
    }

    for (const step of this.steps) {
      if (step.pattern === pattern) {
        throw new Error("step already registered");
      }
    }

    this.steps.push(new StepDef(token, pattern, action));
  }

  given(pattern, action) {
    this.addstep(Token.GIVEN, pattern, action);
  }

  when(pattern, action) {
    this.addstep(Token.WHEN, pattern, action);
  }

  then(pattern, action) {
    this.addstep(Token.THEN, pattern, action);
  }

  after(fn) {
    this.afterSteps.push(fn);
  }

  before(fn) {
    this.beforeSteps.push(fn);
  }

  getMatch(step) {
    for (const stepdef of this.steps) {
      if (stepdef.match(step)) {
        return stepdef;
      }
    }
    return null;
  }

  async cleanup() {
    for (const fn of this.afterSteps) {
      await fn();
    }
  }

  async setup() {
    for (const fn of this.beforeSteps) {
      await fn();
    }
  }
}

class Step {
  constructor(token, stepPattern, table) {
    this.token = token;

    const { pattern, data } = verifyMatchParams(stepPattern);
    this.pattern = pattern;
    this.data = data;
    this.table = table;
  }
}

function verifyMatchParams(pattern) {
  var reg = RegExp(/(\d+|"([^\"]*)"|'([^\']*)')/g); // eslint-disable-line no-useless-escape
  var data = [];
  let found = pattern.match(reg);

  if (!found) {
    found = [];
  }

  for (const match of found) {
    if (match[0] === '"' || match[0] === "'") {
      data.push(match.substring(1, match.length - 1));
    } else {
      data.push(match);
    }
  }

  pattern = pattern.replace(/\"[^\"]*\"/g, "{string}"); // eslint-disable-line no-useless-escape
  pattern = pattern.replace(/\'[^\']*\'/g, "{string}"); // eslint-disable-line no-useless-escape
  pattern = pattern.replace(/\d+/g, "{int}"); // eslint-disable-line no-useless-escape

  return { pattern, data };
}

class Table {
  constructor(data) {
    this.data = data;

    if (!this.valid()) {
      throw new Error("Invalid table provided, please recheck");
    }
  }

  valid() {
    if (!Array.isArray(this.data)) {
      return false;
    }

    let len;
    for (const item of this.data) {
      if (!Array.isArray(item)) {
        return false;
      }
      if (len) {
        if (item.length !== len) {
          return false;
        }
      }
      len = item.length;
    }
    return true;
  }

  rowsHash() {
    if (this.data[0].length > 2) {
      throw new Error(
        "Cannot perform rowsHash on table with more than 2 columns"
      );
    }

    const result = {};
    for (let i = 0; i < this.data.length; i++) {
      result[this.data[i][0]] = this.data[i][1];
    }
    return result;
  }

  rows() {
    return this.data;
  }

  raw() {
    return this.data;
  }

  hashes() {
    const header = this.data[0];
    const result = [];
    for (let i = 1; i < this.data.length; i++) {
      const hash = {};
      for (let j = 0; j < this.data[i].length; j++) {
        hash[header[j]] = this.data[i][j];
      }
      result.push(hash);
    }
    return result;
  }
}

module.exports = { Token, Step, StepDef, TestContext, Table };
