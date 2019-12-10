import { h } from './727393db.js';

function _taggedTemplateLiteral(strings, raw) {
  if (!raw) {
    raw = strings.slice(0);
  }

  return Object.freeze(Object.defineProperties(strings, {
    raw: {
      value: Object.freeze(raw)
    }
  }));
}

var r = {
  data: ""
},
    t = function (t) {
  try {
    var e = t ? t.querySelector("#_goober") : self._goober;

    if (!e) {
      var a = t || document.head;
      a.innerHTML += '<style id="_goober"> </style>', e = a.lastChild;
    }

    return e.firstChild;
  } catch (r) {}

  return r;
},
    a = /(?:([a-z0-9-%@]+) *:? *([^{;]+?);|([^;}{]*?) +{)|(})/gi,
    n = /\/\*.*?\*\/|\s{2,}|\n/gm,
    i = function (r, t, e) {
  var a = "",
      n = "",
      c = "";
  if (/^@[k|f]/.test(e)) return e + JSON.stringify(r).replace(/","/g, ";").replace(/"|,"/g, "").replace(/:{/g, "{");

  for (var o in r) {
    var u = r[o];

    if ("object" == typeof u) {
      var s = t + " " + o;
      /&/g.test(o) && (s = o.replace(/&/g, t)), "@" == o[0] && (s = t), n += i(u, s, s == t ? o : e || "");
    } else /^@i/.test(o) ? c = o + " " + u + ";" : a += o.replace(/[A-Z]/g, "-$&").toLowerCase() + ":" + u + ";";
  }

  if (a.charCodeAt(0)) {
    var f = t + "{" + a + "}";
    return e ? n + e + "{" + f + "}" : c + f + n;
  }

  return c + n;
},
    c = {
  c: 0
},
    o = function (r, t, e, o) {
  var u = JSON.stringify(r),
      s = c[u] || (c[u] = e ? "" : ".go" + u.split("").reduce(function (r, t) {
    return r + t.charCodeAt(0) | 8;
  }, 4));
  return function (r, t, e) {
    t.data.indexOf(r) < 0 && (t.data = e ? r + t.data : t.data + r);
  }(c[s] || (c[s] = i(r[0] ? function (r) {
    for (var t, e = [{}]; t = a.exec(r.replace(n, ""));) t[4] && e.shift(), t[3] ? e.unshift(e[0][t[3]] = {}) : t[4] || (e[0][t[1]] = t[2]);

    return e[0];
  }(r) : r, s)), t, o), s.slice(1);
},
    u = function (r, t, e) {
  return r.reduce(function (r, a, n) {
    var i = t[n];

    if ("function" == typeof t[n]) {
      var c = t[n](e),
          o = c && (c.attributes || c.props),
          u = o && o.className || /^go/.test(c) && c;
      i = u ? "." + u : o ? "" : c;
    }

    return r + a + (i || "");
  }, "");
};

function s(r) {
  var e = this || {},
      a = r.call ? r(e.p) : r;
  return o(a.map ? u(a, [].slice.call(arguments, 1), e.p) : a, t(e.target), e.g, e.o);
}

var f,
    l = s.bind({
  g: 1
}),
    g = function (r) {
  return f = r;
};

function d(r) {
  var t = this || {};
  return function () {
    var e = arguments;
    return function (a) {
      var n = t.p = Object.assign({}, a),
          i = n.className;
      return t.o = /\s*go[0-9]+/g.test(i), n.className = s.apply(t, e) + (i ? " " + i : ""), f(r, n);
    };
  };
}

function _templateObject() {
  const data = _taggedTemplateLiteral(["\n  padding: 10px;\n  margin: 10px;\n  background: black;\n  color: White;\n  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.05);\n  font-size: 20px;\n  border: none;\n  border-radius: 100px;\n"]);

  _templateObject = function () {
    return data;
  };

  return data;
}
g(h);
const Button = d("button")(_templateObject());

function redirect() {
  window.history.pushState({}, "root", "/root");
}

function Component() {
  return h("h1", null, "preact app, Shadow Dom style does not affect preact content", h(Button, {
    onclick: redirect
  }, "css-in-js inside the shadowDom"));
}

export default Component;
//# sourceMappingURL=aa18fb5d.js.map
