Architecture
============

Introduction
------------

The Car Health Check solution delivers continuous vehicle health monitoring
and predictive diagnostics for connected fleets. It gathers telemetry data
from onboard systems, evaluates operational conditions using health analytics,
and proactively alerts users about anomalies before they become critical
failures.

System Components
-----------------

The solution consists of the following major components:

* Web Application
* REST API Layer
* Vehicle Diagnostic Engine
* Notification Service
* Database

Logical Architecture
--------------------

.. code-block:: text

   +-----------------+
   | Vehicle Sensors |
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

Authentication
--------------

The platform supports:

* OAuth2 Authentication
* JWT Token Validation
* Role-Based Access Control

Roles
-----

Administrator
~~~~~~~~~~~~~

* Manage users
* Configure rules
* Monitor system health

Service Engineer
~~~~~~~~~~~~~~~~

* Review diagnostics
* Investigate alerts
* Generate reports

Vehicle Owner
~~~~~~~~~~~~~

* View vehicle status
* Receive notifications
* Download reports

Data Processing Flow
--------------------

#. Vehicle sends telemetry data.
#. API validates incoming data.
#. Diagnostic engine evaluates vehicle health.
#. Alerts are generated if thresholds are exceeded.
#. Notifications are sent to users.

Non-Functional Requirements
---------------------------

+----------------+-------------------+
| Requirement    | Value             |
+================+===================+
| Availability   | 99.5%             |
+----------------+-------------------+
| Response Time  | < 2 seconds       |
+----------------+-------------------+
| Security       | HTTPS/TLS         |
+----------------+-------------------+
| Scalability    | Horizontal Scaling|
+----------------+-------------------+

Future Enhancements
-------------------

* AI-based diagnostics
* Predictive maintenance
* Fleet health analytics
