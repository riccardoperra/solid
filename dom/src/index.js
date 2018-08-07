import { createRuntime } from 'babel-plugin-jsx-dom-expressions';
import S from 's-js';

function handleEvent(handler, id) {
  return function(e) {
    let node = e.target,
      name = `__ev$${e.type}`;
    while (node && node !== this && !(node[name])) node = node.parentNode;
    if (!node || node === this) return;
    if (node[name] && node[name + 'Id'] === id) handler(node[name], e);
  }
}

function shallowDiff(a, b) {
  let sa = new Set(a), sb = new Set(b);
  return [a.filter(i => !sb.has(i)), (b.filter(i => !sa.has(i)))];
}

export const r = createRuntime({wrap: S.makeComputationNode});

let eventId = 0
export function delegateEvent(eventName, handler) {
  let attached = null,
    eId = ++eventId,
    fn = handleEvent(handler, eId);
  S.cleanup(() => attached && attached.removeEventListener(eventName, fn));
  return data => element => {
    element[`__ev$${eventName}`] = data;
    element[`__ev$${eventName}Id`] = eId;
    if (attached) return;
    attached = true
    Promise.resolve().then(() => {
      attached = 'getRootNode' in element ? element.getRootNode() : document;
      attached.addEventListener(eventName, fn);
    })
  }
}

export function selectOn(signal, handler) {
  let index = [];
  S.on(signal, prev => {
    let id = signal()
    if (prev != null && index[prev]) handler(index[prev], false);
    if (id != null) handler(index[id], true);
    return id;
  });
  return id => element => {
    index[id] = element
    S.cleanup(() => index[id] = null);
  }
}

export function multiSelectOn(signal, handler) {
  let index = [];
  S.on(signal, prev => {
    let value = signal();
    [additions, removals] = shallowDiff(value, prev)
    additions.forEach(id => handler(index[id], true))
    removals.forEach(id => handler(index[id], false))
    return value;
  });
  return id => element => {
    index[id] = element;
    S.cleanup(() => index[id] = null);
  }
}