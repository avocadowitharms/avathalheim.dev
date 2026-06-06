---
title: What I Learned Building Flowtime in Flutter
description: A practical reflection on Flutter architecture, state, polish, and shipping a small productivity app.
date: 2026-05-18
updated: 2026-05-18
tags: [Flowtime, Flutter, Architecture, Development]
project: Flutter
featured: true
draft: true
---

## Why Flutter fit Flowtime

Flowtime is a small app, but it still needs to feel calm, responsive, and predictable. Flutter gave me a way to move quickly across platforms without giving up control over the interface.

The best part was not only hot reload. It was the ability to treat interface details as code I could keep refining.

## Architecture lessons

For a timer, state sounds simple until it touches pause behavior, app lifecycle events, notifications, history, and persistence.

I learned to keep the timer logic boring and separate from the widgets. The UI can change often. Timekeeping code should not.

## What I would keep

- Small, focused state objects
- Plain models for session data
- Separate services for persistence and platform behavior
- UI components that do one thing well

## What I am still improving

I want Flowtime to stay easy to reason about as it grows. That means resisting abstractions until the product actually needs them, and documenting the decisions that are easy to forget later.
