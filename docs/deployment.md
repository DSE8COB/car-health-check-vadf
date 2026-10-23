# Deployment Guide

## Overview

This document describes the deployment procedure for the Car Health Check application.

## Deployment Environment

The application is deployed using containers on OpenShift.

## Prerequisites

Before deployment, verify:

- OpenShift access is available
- Docker image is built
- Database is running
- Service account permissions are configured

## Build Container Image

```bash
docker build -t car-health-check:1.0 .
```

## Push Image

```bash
docker tag car-health-check:1.0 registry.company.com/car-health-check:1.0

docker push registry.company.com/car-health-check:1.0
```

## Deploy Application

```bash
oc apply -f deployment.yaml
```

## Verify Pods

```bash
oc get pods
```

Expected Output:

```text
car-health-check-5d5cf8 Running
```

## Verify Service

```bash
oc get svc
```

Expected Output:

```text
car-health-check-service
```

## Verify Route

```bash
oc get route
```

Example:

```text
https://car-health-check.apps.cluster.example.com
```

## Database Configuration

The following values must be configured:

| Parameter | Description |
|------------|-------------|
| DB_HOST | Database Host |
| DB_PORT | Database Port |
| DB_NAME | Database Name |
| DB_USER | Database User |

## Health Check

Application health endpoint:

```text
/actuator/health
```

Example:

```json
{
  "status": "UP"
}
```

## Rollback

Rollback to previous deployment:

```bash
oc rollout undo deployment/car-health-check
```

## Monitoring

Monitor the following:

- CPU Utilization
- Memory Utilization
- Error Rate
- API Response Time
