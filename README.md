# Missing Podo: The Ankara Case

## User Information

* **Name**: Emre Bilgiç

## Project Description

This project is a compact investigation dashboard built for the Jotform Frontend Challenge.

The application fetches data from multiple Jotform sources, normalizes them into a shared investigation model, and presents the case in a person-centered interface. The main goal is to help the user trace Podo’s movement, inspect linked people, review suspicious clues, and navigate connected records efficiently.

Instead of showing raw submissions separately, the app combines them into a single investigation workflow.

## Scenario Focus

The dashboard is designed around the **Missing Podo** case.

It helps the user:

* track Podo’s latest known trail
* inspect linked people and their records
* identify suspicious individuals
* filter records by source and location
* navigate between related people directly from the record details

## Data Sources

The app integrates the following Jotform data sources:

* Checkins
* Messages
* Sightings
* Personal Notes
* Anonymous Tips

These sources are fetched separately and then normalized into a unified structure for investigation use.

## Main Features

* Jotform API integration through a Vite proxy
* normalization of multiple source types into one shared record model
* compact investigation workspace layout
* person-centered investigation flow
* suspicious people ranking with clue breakdown
* Podo trail summary
* selected person insight summary
* source filtering
* location filtering
* linked people navigation from record details
* production build support

## Tech Stack

* React
* TypeScript
* Vite
* CSS

## Project Structure

```text
src/
  api/
    jotform.ts
  config/
    forms.ts
  types/
    index.ts
  utils/
    normalizeCheckins.ts
    normalizeMessages.ts
    normalizeSightings.ts
    normalizePersonalNotes.ts
    normalizeAnonymousTips.ts
    people.ts
    search.ts
  App.tsx
  App.css
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create the local environment file

Create a `.env.local` file in the project root and add:

```env
JOTFORM_API_KEY=your_api_key_here
```

### 3. Start the development server

```bash
npm run dev
```

This will start the local development environment.

## Production Build

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## How the API Works

The app uses a Vite proxy to communicate with the Jotform API.

This approach was chosen to:

* avoid browser-side CORS issues
* avoid exposing the API key directly in the client code
* keep the frontend fetch flow simple

## Investigation Workflow

The interface is organized as a compact workspace:

* **Left panel**: people involved in the case
* **Center panel**: selected person details, insights, filters, and linked records
* **Right panel**: Podo summary and suspicious people overview

This layout was chosen to support faster clue exploration instead of a long vertically stacked page.

## How to Test the Project

After running the app, test the following flows:

1. Select a person from the left panel and confirm the detail panel updates
2. Change the source filter and confirm the visible records update
3. Change the location filter and confirm the visible records update
4. Click a linked person inside a record and confirm the selected person changes
5. Click a suspicious person and confirm the app navigates to that person
6. Check that Podo trail summary values look correct
7. Verify that filtering can produce an empty result state without breaking the UI
8. Run the production build with:

```bash
npm run build
```

## Design Decisions

A few important implementation choices:

* The app uses a **person-centered investigation model** instead of showing each Jotform source separately.
* Multiple submission types are normalized into one shared record structure.
* A compact workspace layout was preferred over a map-heavy or highly visual approach in order to maximize investigation speed and clarity within challenge time limits.
* Filtering and linked-person navigation were prioritized over advanced visualization features.

## Trade-offs

Due to the time-bounded nature of the challenge:

* the interface focuses on investigation flow rather than animation-heavy polish
* the dashboard emphasizes readability and connection tracking over complex visual analytics
* the final structure is optimized for fast clue exploration and direct interaction

## Notes

This project was developed as an individual challenge submission for the Jotform Frontend Challenge.
