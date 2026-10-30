"""Post-sign-up referral redemption: POST /v1/referral/redeem links a signed-in
account to the inviter's code, then the existing settle machinery pays the
configured bonus at the next charged request — the same rules as a sign-up-time
code, never a new path."""

from __future__ import annotations

from test_accounts import auth, chat, make
from test_cloud import sign_up


async def sign_up_as(client, sender, identifier):
    return await sign_up(client, sender, identifier)


async def test_valid_redemption_links_the_accounts():
    app, client, sender, up, cloud, settings = make(allowance_cny=25, invite_bonus_cny=3)
    a = await sign_up_as(client, sender, "redeem-a@example.com")
    b = await sign_up_as(client, sender, "redeem-b@example.com")
    ka, kb = a["api_key"], b["api_key"]

    inv = (await client.get("/v1/me/invite", headers=auth(ka))).json()
    code = inv["code"]
    assert len(code) == 8

    r = await client.post("/v1/referral/redeem", headers=auth(kb), json={"code": code})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["linked"] is True
    assert body["inviter"]["id_prefix"] == a["account"]["id"][:8]
    assert body["bonus_cny"] == 3 and body["bonus_when"] == "first_use"
    # the refreshed account view rides along: the tag and the pool figures
    assert body["account"]["tag"] == b["account"]["tag"]
    assert body["spend"]["left"] == b["spend"]["left"] == 25

    # the link is the same one a sign-up-time code makes
    assert cloud.db.account(b["account"]["id"])["invited_by"] == a["account"]["id"]
    assert cloud.db.account(a["account"]["id"])["invites"] == 1
    kinds_a = [e["kind"] for e in (await client.get("/v1/me/events", headers=auth(ka))).json()["events"]]
    kinds_b = [e["kind"] for e in (await client.get("/v1/me/events", headers=auth(kb))).json()["events"]]
    assert "invite.accepted" in kinds_a and "invite.used" in kinds_b

    # and the existing settle machinery pays it out at the next charged request
    await chat(client, kb)
    ma = (await client.get("/v1/me", headers=auth(ka))).json()
    mb = (await client.get("/v1/me", headers=auth(kb))).json()
    assert ma["spend"]["grant"] == 28 and mb["spend"]["grant"] == 28
    assert ma["invite"]["settled"] == 1 and ma["invite"]["earned_cny"] == 3


async def test_duplicate_redemption_is_rejected():
    app, client, sender, up, cloud, settings = make()
    a = await sign_up_as(client, sender, "dup-a@example.com")
    b = await sign_up_as(client, sender, "dup-b@example.com")
    code = (await client.get("/v1/me/invite", headers=auth(a["api_key"]))).json()["code"]

    r = await client.post("/v1/referral/redeem", headers=auth(b["api_key"]), json={"code": code})
    assert r.status_code == 200, r.text
    r = await client.post("/v1/referral/redeem", headers=auth(b["api_key"]), json={"code": code})
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "invite_already_linked"
    assert cloud.db.account(a["account"]["id"])["invites"] == 1  # the counter grew once


async def test_an_account_linked_at_signup_cannot_redeem_again():
    app, client, sender, up, cloud, settings = make()
    a = await sign_up_as(client, sender, "signup-a@example.com")
    code = (await client.get("/v1/me/invite", headers=auth(a["api_key"]))).json()["code"]
    b = await sign_up(client, sender, "signup-b@example.com", invite=code)

    r = await client.post("/v1/referral/redeem", headers=auth(b["api_key"]), json={"code": code})
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "invite_already_linked"


async def test_self_referral_is_rejected():
    app, client, sender, up, cloud, settings = make()
    a = await sign_up_as(client, sender, "self@example.com")
    code = (await client.get("/v1/me/invite", headers=auth(a["api_key"]))).json()["code"]

    r = await client.post("/v1/referral/redeem", headers=auth(a["api_key"]), json={"code": code})
    assert r.status_code == 400, r.text
    assert r.json()["error"]["code"] == "invite_own_code"
    assert cloud.db.account(a["account"]["id"])["invited_by"] == ""


async def test_unknown_and_missing_codes_are_rejected():
    app, client, sender, up, cloud, settings = make()
    b = await sign_up_as(client, sender, "unknown@example.com")

    r = await client.post("/v1/referral/redeem", headers=auth(b["api_key"]), json={"code": "ZZZZZZZZ"})
    assert r.status_code == 404, r.text
    assert r.json()["error"]["code"] == "invite_unknown"

    r = await client.post("/v1/referral/redeem", headers=auth(b["api_key"]), json={"code": "  "})
    assert r.status_code == 400, r.text
    assert r.json()["error"]["code"] == "invite_code_missing"

    # codes read the way people type them: lower case, spaces and dashes stripped
    a = await sign_up_as(client, sender, "sloppy@example.com")
    code = (await client.get("/v1/me/invite", headers=auth(a["api_key"]))).json()["code"]
    r = await client.post("/v1/referral/redeem", headers=auth(b["api_key"]), json={"code": code.lower()[:4] + " " + code[4:]})
    assert r.status_code == 200, r.text


async def test_redeem_needs_a_key():
    app, client, sender, up, cloud, settings = make()
    r = await client.post("/v1/referral/redeem", json={"code": "ABCDEFGH"})
    assert r.status_code == 401, r.text
    r = await client.post("/v1/referral/redeem", headers={"Authorization": "Bearer bogus-key"}, json={"code": "ABCDEFGH"})
    assert r.status_code == 401, r.text
