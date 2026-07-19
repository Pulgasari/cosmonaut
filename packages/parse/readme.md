# CosmonautParser

This document lays out the construction plan for the CosmonautParser we gonna build next.

---

General Notes:

1. The modular blocks for the base parsing mechanics are provided by `/blocks`. These are pure and kinda its "own thing" but used here.

2. Special higher-level parsing methods are stored in `/methods`. (They will be expanded and enhanced over time. They are kinda pure as well and could be used without the CosmonautParser we are building. But they are also the core mechanics the CosmonautParser provides.

3. The Parser State of the Parser is provided by the `ParserState` class in `/classes/ParserState.js`.

---
