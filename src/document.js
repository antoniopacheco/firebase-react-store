import {NOT_SET} from './constants';
import {state} from './state';

export class Document {
  constructor(db, path) {
    this._ref = db.fdb.ref(path);
    this._value = NOT_SET;
    this._listeners = new Set();
    this._valuePromise = new Promise((resolve) => {
      this._resolveValues = resolve;
    });

    this._ref.on('value', this._onValueHandler);
  }

  _onValueHandler = (response) => {
    this._value = response.val();
    this._resolveValues();

    for (let listener of this._listeners) {
      try {
        listener();
      } catch (e) {
        console.error(e);
      }
    }
  };

  get value() {
    // add all pending views (they are in the call stack
    // somewhere) as a listener
    for (let func of state.pendingViews) {
      this._listeners.add(func);
      let documents = func._documents;
      if (documents === undefined) {
        documents = func._documents = new Set();
      }
      documents.add(this);
    }

    if (this._value === NOT_SET) throw NOT_SET;
    return this._value;
  }

  onValues = async () => {
    await this._valuePromise;
    return Object.assign({}, this._value);
  };

  /**
   * Set a value, replacing whatever value is already present.
   *
   * To update specific fields use `update`.
   *
   * @param values:Object of properties to set
   * @returns Promise
   */
  set = (values) => {
    return this._ref.set(values);
  };

  /**
   * Push a new child value without conflicts
   *
   * @param obj
   * @returns Promise
   */
  push = (obj) => {
    return this._ref.push(obj);
  };

  /**
   * Update specific fields
   *
   * @param values:Object of properties to set
   * @returns Promise
   */
  update = (values) => {
    return this._ref.update(values);
  };

  /**
   * Remove the path referred to by this document. This will also remove
   * any child nodes of the current path.
   *
   * @returns Promise
   */
  remove = () => {
    return this._ref.remove();
  };

  close = () => {
    this.ref && this.ref.off('value');
  };
}
