const test = require("node:test");
const assert = require("node:assert");
const { loadListener } = require("./helpers");

const listener = loadListener();

test("Strict word boundary validation in content-dark-listener.js", () => {
  const text = "often of offset and roof of the world.";
  const matches = listener.findMatchesInText(text, ["of"]);

  assert.strictEqual(matches.length, 2);
  assert.deepStrictEqual(matches[0], [6, 8]);
  assert.deepStrictEqual(matches[1], [25, 27]);
});

test("Multi-word phrase matching in content-dark-listener.js", () => {
  const text = "Welcome to the Map of France document.";
  const listenerMatches = listener.findMatchesInText(text, ["Map of France"]);
  assert.strictEqual(listenerMatches.length, 1);
  assert.strictEqual(
    text.slice(listenerMatches[0][0], listenerMatches[0][1]),
    "Map of France",
  );
});

test("Highlight query parsing in content-dark-listener.js", () => {
  // Quoted query marks exactOnly: true
  const quotedParsed = listener.parseHighlightQuery('"installation guide"');
  assert.deepStrictEqual(quotedParsed.phrases, ["installation guide"]);
  assert.deepStrictEqual(quotedParsed.tokens, ["installation", "guide"]);
  assert.strictEqual(quotedParsed.exactOnly, true);

  // Unquoted multi-word creates candidate contiguous phrase and tokens
  const unquotedParsed = listener.parseHighlightQuery("Map of France");
  assert.deepStrictEqual(unquotedParsed.phrases, ["Map of France"]);
  assert.deepStrictEqual(unquotedParsed.tokens, ["Map", "of", "France"]);
  assert.strictEqual(unquotedParsed.exactOnly, false);

  // Single word has no phrase
  const singleParsed = listener.parseHighlightQuery("installation");
  assert.deepStrictEqual(singleParsed.phrases, []);
  assert.deepStrictEqual(singleParsed.tokens, ["installation"]);
  assert.strictEqual(singleParsed.exactOnly, false);

  // Preserves apostrophes
  const hlContraction = listener.parseHighlightQuery("don't");
  assert.strictEqual(hlContraction.exactOnly, false);
  assert.deepStrictEqual(hlContraction.tokens, ["don", "t"]);

  // Mixed query does not leak quoted phrase tokens into Pass 2 tokens
  const mixedHl = listener.parseHighlightQuery('rivers "Map of France"');
  assert.deepStrictEqual(mixedHl.phrases, ["Map of France"]);
  assert.deepStrictEqual(mixedHl.tokens, ["rivers"]);
  assert.strictEqual(mixedHl.exactOnly, false);

  // Ignores OR, -negated, and field/type qualifiers while preserving prefix*
  const hlOp = listener.parseHighlightQuery(
    'config* OR podman -daemon -"legacy mode" type:md title:Runtime',
  );
  assert.deepStrictEqual(hlOp.phrases, []);
  assert.deepStrictEqual(hlOp.tokens, ["config*", "podman"]);
  assert.strictEqual(hlOp.exactOnly, false);
});

test("Prefix wildcard highlighting in content-dark-listener.js", () => {
  const text = "Configuring and Reconfigure config.";
  const matches = listener.findMatchesInText(text, ["config*"]);
  assert.strictEqual(matches.length, 2);
  assert.strictEqual(text.slice(matches[0][0], matches[0][1]), "Configuring");
  assert.strictEqual(text.slice(matches[1][0], matches[1][1]), "config");
});
