# Conference and Committee domain classes

`Conference` is the aggregate root for conference-wide resources and `Committee` owns deliberation state and behavior. The frontend will keep reactive class instances in its stores, serialize them through explicit DTO `toJSON()`/`fromJSON()` boundaries, and expose committee collections through read-only copies; navigation and store commands will distinguish opening a conference overview from opening a committee.

The classes live in Svelte `.svelte.ts` modules so their mutable fields can use `$state`; direct object spreading is not a valid mutation strategy because reactive class fields are non-enumerable.
