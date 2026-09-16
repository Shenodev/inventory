# ShenoInventory - System Architecture (Demo-Ready Single Tenant)

## Overview
ShenoInventory is a streamlined inventory management system built to showcase product stock, reservations, and sales. It is designed as a closed system with a pre-populated demo user and dummy data. No public signup exists.

## Domain Architecture
- **Web Application:** `inventory.shenodev.tech` (Analog.js) - Handles login and the main dashboard.
- **Backend API:** `api.inventory.shenodev.tech` (Laravel 11.x via Vercel PHP)

## Repository Structure (Monorepo approach)
/sheno-inventory
├── /backend            # Laravel REST API
├── /apps/web           # Analog.js Frontend
└── /packages/ui        # Shared UI components (Tailwind config, Design System)