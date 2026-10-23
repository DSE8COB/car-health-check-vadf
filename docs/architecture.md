# Architecture

## Introduction

The Car Health Check platform provides real-time monitoring and diagnostics for connected vehicles. The system collects vehicle telemetry, analyzes health indicators, and notifies users when potential issues are detected.

## System Components

The solution consists of the following major components:

- Web Application
- REST API Layer
- Vehicle Diagnostic Engine
- Notification Service
- Database

## Logical Architecture

```text
+-----------------+
| Vehicle Sensor  |
+--------+--------+
         |
         v
+-----------------+
| REST API Layer  |
+--------+--------+
         |
         v
+--------------------+
| Diagnostic Engine  |
+----+----------+----+
     |          |
     v          v
+--------+   +--------+
| Alerts |   | Reports|
+--------+   +--------+
     |
     v
+------------------+
| Notification Sv. |
+------------------+
```

## Authentication

The platform supports:

- OAuth2 Authentication
- JWT Token Validation
- Role-Based Access Control

## Roles

### Administrator

- Manage users
- Configure rules
- Monitor system health

### Service Engineer

- Review diagnostics
- Investigate alerts
- Generate reports

### Vehicle Owner

- View vehicle status
- Receive notifications
- Download reports

## Data Processing Flow

1. Vehicle sends telemetry data.
2. API validates incoming data.
3. Diagnostic engine evaluates vehicle health.
4. Alerts are generated if thresholds are exceeded.
5. Notifications are sent to users.

## Non-Functional Requirements

| Requirement | Value |
|------------|--------|
| Availability | 99.5% |
| Response Time | < 2 seconds |
| Security | HTTPS/TLS |
| Scalability | Horizontal Scaling |

## Future Enhancements

- AI-based diagnostics
- Predictive maintenance
- Fleet health analytics
