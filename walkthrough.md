# Walkthrough of Phase 3 Manifest History & Records Logs

We have successfully integrated a complete, date-wise Manifest History Records Log with dynamic status updater and reprint support!

## Features Implemented:

### 1. MongoDB Manifest Storage (Backend)
- Created the [Manifest.js](file:///C:/Users/tanuj/OneDrive/Desktop/Jain%20Courier%20Management%20System%20(JCMS)/courier-scanner/backend/models/Manifest.js) model.
- Created [manifestRoutes.js](file:///C:/Users/tanuj/OneDrive/Desktop/Jain%20Courier%20Management%20System%20(JCMS)/courier-scanner/backend/routes/manifestRoutes.js) to support manifest creation (`POST /`), history fetching (`GET /`), status changes (`PUT /:id/status`), and record deletions (`DELETE /:id`).

### 2. Frontend Sub-Tabs & History UI (Frontend)
- Added interactive sub-tabs inside the Manifest tab of [index.html](file:///C:/Users/tanuj/OneDrive/Desktop/Jain%20Courier%20Management%20System%20(JCMS)/courier-scanner/Frontend/index.html):
  1. **Create Manifest** (contains the current unified packages list and preview).
  2. **Manifest History Log** (shows a clean table of all generated manifests, sorted date-wise).
- Added an inline status dropdown selector for each manifest in the table (e.g. Pending Pickup, Handed Over, In Transit, Completed) that updates the MongoDB state instantly.
- Added a **Reprint (🖨️)** button that pulls historical manifest snapshots and opens the print layout automatically.

### 3. Shareable Zip Package Updated
- Synchronized all files across the root directory and the `Frontend` folder, and re-zipped the project into `courier-scanner.zip`.

### 4. Signed Manifest Image Upload (Phase 4)
- Updated `Manifest.js` database model schema to store `signedCopy` (permanently in MongoDB cloud).
- Created backend endpoints `PUT /api/manifests/:id/signed-copy` (save) and `DELETE /api/manifests/:id/signed-copy` (remove).
- Developed a canvas-based client-side image compressor in `app.js` that downsizes and compresses uploaded receipt photos to under 400KB before upload, ensuring lifetime permanent storage in MongoDB Atlas without hitting size constraints.
- Added upload (📤), view (👁️), and remove (❌) action buttons in the Manifest History Log table.

### 5. Document-Wise / Parcel-Wise Status Change (Phase 5)
- **Model Update**: Modified `Manifest.js` schema to support independent status tracking (`Pending`/`Delivered`) for each parcel in the `parcels` array.
- **Backend API**: Implemented `PUT /api/manifests/:manifestId/parcels/:trackingId/status` to update individual parcel delivery status inside the manifest array, automatically synchronizing with the `Scan` collection.
- **Accordion UI Sub-tables**: Replaced the main row dropdown with a progress tracker badge (e.g. "Pending", "Delivered", or "Delivered (1/3)").
- **Collapsible Nested Tables**: Clicking any manifest main row in the history list smoothly expands an inline detailed table of its parcels, exposing independent `Pending`/`Delivered` status dropdown controls for each document/tracking ID.

## Verification Instructions:
- Restart the server with `npm start`.
- Hard refresh (`Ctrl + F5`) the browser page at `http://localhost:5000/auth.html`.
- Go to the **Manifest History Log** tab.
- Click on any manifest row to expand it! You will see an accordion sub-table displaying all parcels in that manifest.
- Change the status dropdown for any individual package to "Delivered" and watch the manifest's progress badge update instantly!
- Click the upload icon (`upload-cloud`) on any manifest to attach a signed photo.
- Open the package `courier-scanner.zip` or the password-protected `courier-scanner.rar` to deploy on other systems.
