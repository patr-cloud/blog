---
title: "Where were we all these years?"
description: "I shut down a company I loved. Patr survived, went open source, and I'm not done. Here's the whole story, and an invitation."
pubDate: 2026-06-01
author: "rakshith-ravi"
tags: ["patr", "open-source", "startup", "lessons"]
---

Where were we?

Fair question. Patr went quiet for a long time, and if you noticed, you deserve the real answer instead of the polite one. So here it is: a few years ago I shut down the company I'd built. The one Patr used to be. It wasn't the usual startup death either. The product worked and it was growing when I turned it off.

This post is me finally explaining that. It's a long story, and running through all of it is a belief I've held my entire career: deploying an app shouldn't need a whole team. That belief survived everything you're about to read.

# The dream I actually had

One thing about me before we get to the company, because nothing else here makes sense without it.

I want to build things that help people. That's the whole ambition. Somewhere out there, someone I'll never meet opens a thing I made, gets their work done, and thinks "thank god this exists" without ever learning my name. I think about that more than I'd like to admit. Building software happens to be what I'm good at, so software is how I chase it.

Deployments are where I got my shot. I've spent my career watching teams treat shipping an app like open heart surgery. Dedicated hires, pipelines, YAML, dashboards, a small army babysitting infrastructure so that something that's already built can go live. It never sat right with me. You built the thing. Getting it in front of users should be the easy part, and instead it's an entire profession. I figured if I did my job well enough, you'd never have to think about any of it. You build, the platform deals with the rest.

So I built it.

# It worked

People signed up, deployed real things, came back, told their friends. Month after month it grew, and for a while I got to live the good version of the startup story.

This is where I'd normally show you a graph. I'm not going to, and I won't be naming names anywhere in this post either. Some of the details aren't only mine to share anymore, and the rest I just shouldn't put on the internet. I know "trust me, it was going great" is a lot to ask from a stranger's blog, but it's what I have. It was going great.

# Abuse is free. Stopping it isn't.

I believed then, and still believe, that a good product should have a free tier. Put yourself in the user's shoes: you want to try something without pulling out a card, and a well-designed free tier barely costs the company anything to give you. You get to fall in love with the product before paying for it, and I get a user who actually wants to be there. Everyone wins.

That was the plan, anyway. What showed up instead was crypto miners. VPN miners. Scrapers. DDoS infrastructure. Porn (you would not believe the kind of shit I've had to look at). People with zero interest in the product and infinite interest in free compute, arriving in waves, every day, with fresh accounts.

Yes, I know free tiers get abused. Everyone knows that. I expected a chunk of it and built guards for the obvious cases. What I hadn't done the math on was how expensive it gets to fight it properly once the volume picks up.

Stopping abuse at scale is not a clever weekend hack. It's a stack of paid services: fraud scoring on signups, bot mitigation, phone and card verification, and then your own hours on top of all of it, reviewing whatever slips through. Each one is a monthly bill, priced in US dollars.

Here's the part that's invisible from San Francisco. $500 a month for fraud detection is a rounding error to a Bay Area founder. I was building this from India (I spawned at the wrong location for this, I know), and against what things actually cost and earn here, that same $500 hurts. [Purchasing power parity](https://en.wikipedia.org/wiki/Purchasing_power_parity) is the whole story here, and none of these tools price for it.

Now stack five or six of those services, because you need all of them. My anti-abuse bill stopped looking like SaaS spend and started looking like a salary. In India it literally was one: keeping the freeloaders out cost about what one or two engineers would have. A US competitor with the identical product and identical abusers just expenses the whole stack and gets on with their day. I was choosing between fraud tooling and headcount.

# The next ChatGPT would never come from India

The obvious response is "so raise money". Cover the fraud stack with someone else's money, get back to building. Sure. Let me tell you how that goes for a first-time founder in India.

Raising is chicken-and-egg everywhere: investors want traction before they write a check, and you need the check to grow. Fine, that's the game. In some parts of the world there's a way out of the loop, because someone occasionally bets on a founder before the proof exists.

That bet does not happen here. Indian VCs don't back founders, they back receipts. They're not buying the future you're describing, they're buying the past you can prove. And if you're bootstrapped, with your margin getting eaten by dollar-priced fraud tooling, receipts are precisely the thing you can't manufacture. You can't get traction without money, you can't get money without traction, and nobody here will spot you the difference on faith.

I'd write all this off as my own bitterness if I hadn't heard the same story from basically every founder I spoke to back then. People building genuinely good things, all stuck in the same loop.

My favorite version of it: a friend of mine ground through two years of pitching here in India and raised 100 thousand dollars. Then they got into Y Combinator, and with the same company, the same product, and the same founder, raised 6 million dollars in two days. They'll tell you themselves that the second raise doesn't happen in India. They'd grown between those raises, sure, and that growth was earned. Doesn't matter. Without the YC stamp, nobody here was writing that check.

So no, this was never about whether the idea was good enough, or whether I was. The next ChatGPT would never come from India. The talent's here. It's just that the V in VC doesn't stand for "venture" in this country.

# The hardest thing I've done

Meanwhile, I had a team. People who'd bet their careers on this thing. And the math from the last two sections eventually arrived where math always arrives: the company could no longer pay them fairly.

I know how founders usually play this. Deferred salaries, "we're a family", equity instead of rent money. I couldn't do it. These people trusted me.

So when the money ran out, I paid them from my own pocket. I went into serious debt doing it, and I'm still paying that debt off today, years later. I mention the debt for one reason only: "I'd rather kill the company than underpay my people" is very easy to type into a blog post years after the fact, and I want you to know I paid for that sentence with my own bank account.

Which meant the company couldn't go on. If underpaying my team was off the table, and it was, there was nothing left to cut. So I shut it down. It worked, it was growing, and I loved it more than anything I'd built before or since. I shut it down because the only way to keep it alive was to be unfair to the people who made it with me.

It gutted me. But everyone got paid, everyone landed on their feet, and the thing died clean. I'd make the same call again tomorrow.

# I couldn't let it go

The company got acquired. Most of it found a home in that deal. While it was being put together, I made one specific ask: leave Patr out. Let me keep this one.

There was no strategy behind that. Honestly, the sane move was the opposite. Let it all go, take the job, throw everything at the debt, be done. I'd just spent months burying something I loved, and every reasonable voice said to stop.

But remember the life goal from the top of this post? Patr was the closest I had ever gotten to it. Giving up the product would have felt like giving up on the goal itself, and I wasn't ready to do that. So I kept it, and I did the only thing I know how to do when something matters this much: I started building again. Open source, this time.

# Where I got it wrong, on purpose

Now for the part I'm least proud of.

When Patr came back as open source, I set it up to serve me first. The self-hosted version was deliberately underpowered. The features that made the product actually good stayed locked in the managed tier, because the managed tier was supposed to be my way out. I was working two jobs at the time to stay afloat and service the debt, and I badly wanted Patr to become the thing I did full time instead. A crippled free version nudging everyone toward the paid one looked like the fastest road there. Oldest move in the open-core playbook. I told myself it was fine.

It wasn't fine, and funnily enough, it didn't even work. Nearly all my time went into babysitting the managed tier while the self-hosted version rotted from neglect. At some point I looked up and realized I'd become the thing I used to complain about: a guy holding the good version hostage while calling it "helping people".

So I flipped it. Self-hosted is now the full product. If you run Patr yourself, you get the real thing, not a demo with the good buttons greyed out.

Do I still want to make a living from this? Absolutely, and I'm done pretending that's something to be embarrassed about. I just changed how. Instead of crippling the open product, I build things on top of it that a specific kind of customer will happily pay for. More on that in a second.

# Where we are now

Patr is open source. The self-hosted version has everything the enterprise version has, minus the features that only large organizations care about: RBAC, SSO, billing, that whole genre of governance machinery. If you're a solo dev or a small team, you will genuinely never miss any of it. Those live in the cloud and enterprise plan, and I'll say the quiet part loudly: that plan is how I intend to make a living from this, so I can work on it full time instead of around two other jobs.

The open product is the real product. The paid product is the real product plus the things big companies need anyway. That's the entire pricing page.

One more thing on this, because I think it matters more than the feature list. You know the usual arc. A company starts out generous, gets big, and then the ratchet turns: features drift behind paywalls, limits shrink, the free tier slowly rots. I'm not even angry about it. The incentives point that way, and companies follow their incentives.

I want Patr's ratchet to turn the other way. As it earns more, features should move from the enterprise list into the open version, and the paid list should get shorter over time. I'm not built different or anything, the goal was just only ever a living, and past the point where the bills are covered I'd honestly rather give the rest away. Intentions are cheap though, mine included. But all of this is open source. If I ever go back on it, it'll be sitting right there in a public commit with my name on it. Feel free to check.

And deploying an app still shouldn't need a whole team. That belief outlived the company that was built on it. Now it belongs to anyone who can run a binary.

# Come build it with me

If any of this resonated, I could use your help.

Rust people for the core platform (you might even enjoy the type-system madness, see [the previous post](/blog/eliminating-tests-with-types)). Frontend people for the dashboard. People who write docs, answer questions, and make a community feel like somewhere worth hanging out. And if you don't fit any of those boxes but something in you went "yeah, I want that to exist", that counts too.

About money, since I promised honesty. I can't pay you today. I'm still paying off the last time I did right by the people who worked with me, and I won't promise what I can't deliver. What I will promise: the moment there's real income from this, the people who built it with me get paid. You've just read what that promise cost me the last time I kept it. I'm not going to break it now.

Somewhere out there is a developer who's going to deploy their first app on Patr, mutter "thank god this exists", and never think about us again. I want to build for that person. Come build for them with me, and let's make this sustainable enough that we get to keep doing it.

The repo is [here](https://github.com/patr-cloud/patr). Let's build.
