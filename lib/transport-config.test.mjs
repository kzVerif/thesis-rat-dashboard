import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAPIURL, validateProductionConfig, isProductionAuthOrigin } from "./transport-config.mjs";

const valid = {
  API_URL: "http://127.0.0.1:8080",
  PUBLIC_DASHBOARD_ORIGIN: "https://lab.example.com",
  NEXT_PUBLIC_FRONTEND_WS_URL: "wss://lab.example.com/ws/frontend",
};

test("same-host HTTP origin with public HTTPS/WSS is supported", () => {
  assert.doesNotThrow(() => validateProductionConfig(valid));
  assert.doesNotThrow(() => validateProductionConfig({ ...valid, API_URL: "https://api.example.com" }));
  assert.equal(validateAPIURL("http://localhost:8080/", false), "http://localhost:8080");
});
test("production rejects insecure public or cookie-incompatible endpoints", () => {
  for (const patch of [
    { API_URL: "http://remote.example.com" }, { API_URL: undefined },
    { PUBLIC_DASHBOARD_ORIGIN: "http://lab.example.com" },
    { NEXT_PUBLIC_FRONTEND_WS_URL: "ws://lab.example.com/ws/frontend" },
    { NEXT_PUBLIC_FRONTEND_WS_URL: undefined },
    { NEXT_PUBLIC_FRONTEND_WS_URL: "wss://socket.example.com/ws/frontend" },
    { NEXT_PUBLIC_FRONTEND_WS_URL: "wss://lab.example.com/ws/frontend?token=secret" },
    { API_URL: "https://user:secret@api.example.com" },
  ]) assert.throws(() => validateProductionConfig({ ...valid, ...patch }));
});
test("only the configured HTTPS browser origin is trusted", () => {
  assert.equal(isProductionAuthOrigin("https://lab.example.com", valid.PUBLIC_DASHBOARD_ORIGIN), true);
  for (const origin of ["https://evil.example.com", "http://lab.example.com", "https://lab.example.com:444", "null"]) {
    assert.equal(isProductionAuthOrigin(origin, valid.PUBLIC_DASHBOARD_ORIGIN), false);
  }
});
