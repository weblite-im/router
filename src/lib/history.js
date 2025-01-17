let getLocation = source => {
  return {
    ...source.location,
    state: source.history.state,
    key: (source.history.state && source.history.state.key) || "initial"
  };
};

let createHistory = (source, options) => {
  let listeners = [];
  let location = getLocation(source);
  let resolveTransition = () => {};

  return {
    get location() {
      return location;
    },

    _onTransitionComplete() {
      resolveTransition();
    },

    listen(listener) {
      listeners.push(listener);

      let popstateListener = () => {
        location = getLocation(source);
        listener({ location, action: "POP" });
      };

      source.addEventListener("popstate", popstateListener);

      return () => {
        source.removeEventListener("popstate", popstateListener);
        listeners = listeners.filter(fn => fn !== listener);
      };
    },

    navigate(to, { state, replace = false } = {}) {
      state = { ...state, key: Date.now() + "" };
      // try...catch iOS Safari limits to 100 pushState calls
      try {
        if (replace) {
          source.history.replaceState(state, null, to);
        } else {
          source.history.pushState(state, null, to);
        }
      } catch (e) {
        source.location[replace ? "replace" : "assign"](to);
      }

      location = getLocation(source);
      let transition = new Promise(res => (resolveTransition = res));
      listeners.forEach(listener => listener({ location, action: "PUSH" }));
      return transition;
    }
  };
};

////////////////////////////////////////////////////////////////////////////////
// Stores history entries in memory for testing or other platforms like Native
let createMemorySource = (initialPathname = "/") => {
  let index = 0;
  let stack = [{ pathname: initialPathname, search: "" }];
  let states = [];

  return {
    get location() {
      return stack[index];
    },
    addEventListener(name, fn) {},
    removeEventListener(name, fn) {},
    history: {
      get entries() {
        return stack;
      },
      get index() {
        return index;
      },
      get state() {
        return states[index];
      },
      pushState(state, _, uri) {
        let [pathname, search = ""] = uri.split("?");
        index++;
        stack.push({ pathname, search });
        states.push(state);
      },
      replaceState(state, _, uri) {
        let [pathname, search = ""] = uri.split("?");
        stack[index] = { pathname, search };
        states[index] = state;
      }
    }
  };
};

////////////////////////////////////////////////////////////////////////////////
// global history - uses window.history as the source if available, otherwise a
// memory history
let canUseDOM = !!(
  typeof window !== "undefined" &&
  window.document &&
  window.document.createElement
);
let getSource = () => {
  return canUseDOM ? window : createMemorySource();
};

let globalHistory = createHistory(getSource());
let { navigate } = globalHistory;

////////////////////////////////////////////////////////////////////////////////
export { globalHistory, navigate, createHistory, createMemorySource };
