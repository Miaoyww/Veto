# Cloud Service authority replaces the local Host Service

## Status

Accepted; supersedes ADR-0008

## Decision

Cloud Service is the sole authority for Cloud Conferences. It owns shared Conference state, SeatAccess, authentication, authorization, command persistence, and realtime routing. Organizer Platform is a separate product surface for creating and configuring Cloud Conferences and for administrative management; its pages may be deployed on Vercel while its authoritative API and realtime backend run on Cloudflare. Organizer Platform does not own a Chair's local agenda or procedural state.

Electron is a participant client, not an organizer backend. Its first-class modes are joining a Cloud Conference with a Seat-specific invite code and running an Offline Mode that may contain multiple Singleton Conferences. The LAN Host, Host Console, and LAN discovery flows are removed. A Display remains a Chair-bound read-only projection over the LAN and does not connect to Cloud Service. Offline Singleton stays account-free, network-free, and local-only. WeChat and Feishu entry points remain visible but have no first-release logic.

Platform accounts exist only on Organizer Platform. They are separate from Conference Users and are not used to authenticate Electron participants. Existing local persistence is intentionally cleared without migration or backward compatibility.
The file subsystem remains out of the first release, including Organizer Platform file management.
