# `fcm-fanout` — FCM push fan-out

Cloud Function (Gen 2). Subscribes to the `tradeson-events` Pub/Sub topic and sends an FCM push to one user per event.

## Architecture

```
Cloud Run (tradeson-api)
       │
       │  publish({ event, targetUserId, title, body, data })
       ▼
Pub/Sub topic: tradeson-events
       │
       │  (push subscription)
       ▼
Cloud Function: fcm-fanout
       │
       │  1. Read users/{targetUserId}.fcmToken from Firestore
       │  2. admin.messaging().send({ token, notification, data })
       ▼
   User's device(s)
```

The publisher is `api/src/services/pubsub.ts`. The four user-facing events that fan out today: `job.created`, `job.status_changed`, `quote.submitted`, `quote.accepted`. Adding a new event is one `publish()` call in the route — no code change here.

## One-time GCP setup

```bash
# Project + region defaults
gcloud config set project tradeson-491518
gcloud config set functions/region us-central1

# Topic
gcloud pubsub topics create tradeson-events

# Cloud Run needs publisher role on the project
gcloud projects add-iam-policy-binding tradeson-491518 \
  --member="serviceAccount:tradeson-api@tradeson-491518.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Function service account needs Firestore + FCM access (default Compute SA usually has these)
# If using a custom SA, grant: roles/datastore.user + roles/firebase.admin
```

## Deploy

```bash
gcloud functions deploy fcm-fanout \
  --gen2 \
  --runtime nodejs20 \
  --region us-central1 \
  --source functions/fcm-fanout \
  --entry-point fanout \
  --trigger-topic tradeson-events \
  --memory 256MB \
  --timeout 60s \
  --max-instances 10
```

## Local test

```bash
cd functions/fcm-fanout
npm install
# Functions Framework local server
npx functions-framework --target=fanout --signature-type=cloudevent

# In another shell, post a test event
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "google.cloud.pubsub.topic.v1.messagePublished",
    "source": "test",
    "id": "1",
    "data": {
      "message": {
        "data": "'"$(echo -n '{"event":"quote.submitted","targetUserId":"YOUR_FIREBASE_UID","title":"Test","body":"Hello"}' | base64)"'"
      }
    }
  }'
```

The function reads `users/{YOUR_FIREBASE_UID}.fcmToken` from Firestore. If it's set and valid, you should receive a push.

## Removing the inline FCM code in Cloud Run

`api/src/routes/quotes.ts` currently has two `messaging.send()` blocks alongside the new `publish()` calls (marked `TODO(K-D)`). Once this Cloud Function is verified live in production, delete those inline blocks. The Pub/Sub fan-out becomes the single push path.

## Why one topic, not one-per-event?

Cheaper to operate, simpler to evolve. The fan-out function does the same thing for every event today (read token + send push). When that diverges (per-event templates, different recipients per event, fanning out to multiple users), splitting topics is straightforward — but premature today.
