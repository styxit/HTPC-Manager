# jobs.py - Generic jobs used with the worker pool
# Copyright (c) 2008 Andrey Petrov
#
# This module is part of workerpool and is released under
# the MIT license: http://www.opensource.org/licenses/mit-license.php

from workerpool.exceptions import TerminationNotice

__all__ = ['Job', 'SuicideJob', 'SimpleJob']


class Job(object):
    "Interface for a Job object."
    def __init__(self):
        pass

    def run(self):
        "The actual task for the job should be implemented here."
        pass


class SuicideJob(Job):
    "A worker receiving this job will commit suicide."
    def run(self, **kw):
        raise TerminationNotice()


class SimpleJob(Job):
    """
    Given a `result` queue, a `method` pointer, and an `args` dictionary or
    list, the method will execute r = method(*args) or r = method(**args),
    depending on args' type, and perform result.put(r).
    """
    def __init__(self, result, method, args=[]):
        self.result = result
        self.method = method
        self.args = args

    def run(self):
        if isinstance(self.args, list) or isinstance(self.args, tuple):
            r = self.method(*self.args)
        elif isinstance(self.args, dict):
            r = self.method(**self.args)
        self._return(r)

    def _return(self, r):
        "Handle return value by appending to the ``self.result`` queue."
        self.result.put(r)
