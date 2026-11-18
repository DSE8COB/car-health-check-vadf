Brake System Specification
==========================

System Overview
---------------

The braking system shall provide safe and predictable
deceleration under all supported operating conditions.

.. warning::

   Emergency braking has **highest priority** and shall
   override all normal braking requests.

Functional Requirements
-----------------------

.. list-table:: Brake System Requirements
   :header-rows: 1
   :widths: 20 55 25

   * - ID
     - Requirement
     - Priority
   * - BRK-001
     - Emergency braking shall be available above 5 km/h.
     - HIGH
   * - BRK-002
     - Brake pressure shall be continuously monitored.
     - HIGH
   * - BRK-003
     - Diagnostic information shall be stored after a failure.
     - MEDIUM

Important Information
---------------------

.. note::

   Changes to **BRK-001** require a safety review.

System Status
-------------

* Normal Braking
* Emergency Braking
* Parking Brake
* Diagnostics