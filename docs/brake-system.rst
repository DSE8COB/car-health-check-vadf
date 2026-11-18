.. _brake-system-spec:

Brake System Specification
==========================

.. |EBS| replace:: Emergency Braking System
.. |ASIL-D| replace:: **ASIL-D**
.. |SAFE| replace:: ``SAFE_STATE``

System Overview
---------------

The |EBS| shall provide safe and predictable deceleration
under all supported operating conditions.

The system continuously evaluates vehicle speed, requested
brake pressure and actual brake pressure to determine the
required braking mode.

.. warning::

   In operating modes where ``vehicle.speed > 5 km/h``,
   emergency braking has **highest priority** and shall
   override ``NORMAL_BRAKE_REQUEST``.

Functional Requirements
-----------------------

.. list-table:: Brake System Requirements
   :header-rows: 1
   :widths: 15 50 15 20
   :class: requirement-table

   * - ID
     - Requirement
     - Priority
     - Safety Level
   * - ``BRK-001``
     - |EBS| shall be available when
       ``vehicle.speed > 5 km/h``.
     - HIGH
     - |ASIL-D|
   * - ``BRK-002``
     - ``brake.pressure.actual`` shall be continuously
       monitored against ``brake.pressure.target``.
     - HIGH
     - |ASIL-D|
   * - ``BRK-003``
     - Diagnostic information shall be stored when
       ``pressure_delta > MAX_PRESSURE_DEVIATION``.
     - MEDIUM
     - ASIL-B

Important Information
---------------------

.. note::

   Changes to ``BRK-001`` or ``BRK-002`` require an
   independent safety review before approval.

Braking Behaviour
-----------------

The controller shall evaluate the following conditions
during every ``10 ms`` control cycle:

.. code-block:: text

   IF brake_request == ACTIVE
      AND vehicle_speed > 5
      AND pressure_actual < pressure_target
   THEN
      braking_mode := EMERGENCY_BRAKING
      diagnostic_state := PRESSURE_FAULT

When ``EMERGENCY_BRAKING`` is activated, the controller
shall transition the braking system into |SAFE| if the
requested pressure cannot be achieved within ``500 ms``.

.. caution::

   Changing ``FAULT_DEBOUNCE_COUNT`` from ``3`` to ``5``
   increases the maximum fault detection time from
   ``30 ms`` to ``50 ms``.

   This change affects the safety assumptions of
   ``BRK-001`` and therefore requires a new safety review.

System States
-------------

The braking system can operate in the following states:

#. ``NORMAL_OPERATION``
#. ``BRAKE_REQUESTED``
#. ``PRESSURE_BUILDUP``
#. ``BRAKING_ACTIVE``
#. ``EMERGENCY_BRAKING``
#. ``SAFE_STATE``

A transition from ``BRAKING_ACTIVE`` to
``EMERGENCY_BRAKING`` shall occur when::

   pressure_actual < (pressure_target * 0.85)

and::

   vehicle_speed > 5

Recovery Conditions
-------------------

Recovery from |SAFE| is permitted only when **all**
of the following conditions are satisfied:

#. ``vehicle_speed == 0``
#. ``brake_request == RELEASED``
#. ``pressure_actual >= MIN_SAFE_PRESSURE``
#. ``diagnostic_state != PRESSURE_FAULT``

.. important::

   If any of the recovery conditions evaluate to ``FALSE``,
   the system shall remain in |SAFE|.

Safety Parameters
-----------------

.. list-table:: Safety Parameters
   :header-rows: 1
   :widths: 40 30 30

   * - Parameter
     - Limit
     - Classification
   * - Control cycle
     - ``10 ms``
     - Critical
   * - Fault detection
     - ``<= 30 ms``
     - Critical
   * - Emergency brake activation
     - ``<= 500 ms``
     - |ASIL-D|
   * - Minimum operating speed
     - ``> 5 km/h``
     - Safety Relevant

Review Impact
-------------

.. attention::

   A modification to ``MAX_PRESSURE_DEVIATION``,
   ``FAULT_DEBOUNCE_COUNT`` or ``MIN_SAFE_PRESSURE`` may
   indirectly change the behaviour of multiple requirements.

   The reviewer shall therefore verify the **rendered
   specification** and not only the individual source-line
   changes.

System Status
-------------

:Normal Braking: Enabled
:Emergency Braking: Enabled
:Parking Brake: Enabled
:Diagnostics: Enabled
:Safety Classification: |ASIL-D|
:Review Status: **Safety Review Required**