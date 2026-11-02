# Hearthwild: ROLE NOT SET on this machine

Before doing anything else, ask the director which role you have on this machine
(`blender` on machine A, `communicator` on machine B), then run:

    node .agents/hooks/set-role.mjs <blender|communicator>

Until then, every file write in the repository is blocked. Read `AGENTS.md` and
`docs/doctrine/README.md` meanwhile.
