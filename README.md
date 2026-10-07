# 🎓 EDVEXA

<p align="center">
  <strong>Next-Generation Enterprise Campus Organization & Student Activity Operating System</strong>
</p>

<p align="center">
  <a href="#-architecture"><img src="https://img.shields.io/badge/Architecture-Clean%20%2F%20Modular-blue?style=for-the-badge" alt="Architecture" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Backend-FastAPI%20%2F%20Python%203.11-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Frontend-React%2018%20%2F%20Vite-61DAFB?style=for-the-badge&logo=react" alt="React" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Database-PostgreSQL%20(ACID%20Compliant)-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" /></a>
  <a href="#-security--integrity"><img src="https://img.shields.io/badge/Security-Strict%20RBAC%20%2B%20JWT-red?style=for-the-badge" alt="Security" /></a>
  <a href="#-license"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" /></a>
</p>

---

## 📌 Executive Summary

Modern university campuses house hundreds of student clubs, technical societies, cultural bodies, and athletic teams. Yet, most campuses still operate on fragmented platforms: Google Forms for registrations, spreadsheet balance sheets for club treasuries, disjointed payment links, and unverified paper tickets at event gates.

**EDVEXA** is a centralized, production-grade enterprise platform designed to unify university club ecosystems. It replaces fragmented workflows with:
- **Zero-trust, multi-tenant organization boundaries**
- **An immutable, double-entry financial treasury engine** with database-level triggers
- **High-concurrency event ticketing** featuring cryptographically verifiable, real-time QR check-in gates
- **An integrated campus merchandise commerce engine** with atomic inventory tracking
- **8-tier granular Role-Based Access Control (RBAC)** across platform, club, and student levels

---

## 🚀 Key Highlights & Architectural Strengths

| Core Pillar | Technical Realization |
| :--- | :--- |
| **🛡️ 8-Tier RBAC Hierarchy** | Strict policy separation across Platform Admin, Org Admin, Treasurer, Event Manager, Gate Staff, Volunteer, Member, and Guest. |
| **💳 Immutable Double-Entry Ledger** | PostgreSQL database triggers (`trg_immutable_ledger`, `trg_immutable_audit`) enforce strict append-only financial records with zero deletion/tampering risks. |
| **🎟️ Real-Time QR Gate Check-ins** | High-throughput gate-scanning engine with anti-passback protections and real-time attendance syncing. |
| **📦 End-to-End Campus Commerce** | SKU & variant management, atomic stock movements, automated cart-to-receipt pipelines, and digital order fulfilment. |
| **📊 Real-Time Financial Treasury** | Term budgets, line-item budget categories, verified expense claims, and transparent club fundraising campaigns. |
| **⚡ High Performance & Scalability** | Async FastAPI backend powered by SQLAlchemy 2.0 with sub-50ms API response times and a lightning-fast React 18 + Vite frontend. |

---

## 🏗️ System Architecture

