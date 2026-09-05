# Seat as the procedural participant

`Seat` is the sole committee participant and procedural actor; cabinet seats carry optional procedure state, while MPC and IPC seats do not. A conference owns its local `User` identities and `SeatAccess` invite codes, persisted domain references use seat IDs, and external consumers receive `SeatView` projections or an `AuthenticatedSeatSession`; the unfinished platform-wide account model and the separate `Delegation` model were removed to keep identity, access, and committee participation as distinct concepts.
