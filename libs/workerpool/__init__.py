# __init__.py
# Copyright (c) 2008 Andrey Petrov
#
# This module is part of workerpool and is released under
# the MIT license: http://www.opensource.org/licenses/mit-license.php

"""
Workerpool module provides a threading framework for managing a constant pool
of worker threads that perform arbitrary jobs.

Tips:

* Workers can be terminated using a SuicideJob which raises a TerminationNotice
exception.

* Performing a del on a pool object will cause the pool to terminate all of its
workers.

* WorkerPool implements a simple map method which allows distributing work in a
similar fashion as using a normal map operation.

* EquippedWorkers can be used to maintain an active resource which is required
for performing a specialized type of job.

"""

from workerpool.exceptions import *
from workerpool.jobs import *
from workerpool.pools import *
from workerpool.workers import *
