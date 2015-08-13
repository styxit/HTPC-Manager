# workers.py - Worker objects who become members of a worker pool
# Copyright (c) 2008 Andrey Petrov
#
# This module is part of workerpool and is released under
# the MIT license: http://www.opensource.org/licenses/mit-license.php

from threading import Thread

from workerpool.exceptions import TerminationNotice

__all__ = ['Worker', 'EquippedWorker']


class Worker(Thread):
    """
    A loyal worker who will pull jobs from the `jobs` queue and perform them.

    The run method will get jobs from the `jobs` queue passed into the
    constructor, and execute them. After each job, task_done() must be executed
    on the `jobs` queue in order for the pool to know when no more jobs are
    being processed.
    """

    def __init__(self, jobs):
        self.jobs = jobs
        Thread.__init__(self)

    def run(self):
        "Get jobs from the queue and perform them as they arrive."
        while 1:
            # Sleep until there is a job to perform.
            job = self.jobs.get()

            # Yawn. Time to get some work done.
            try:
                job.run()
                self.jobs.task_done()
            except TerminationNotice:
                self.jobs.task_done()
                break


class EquippedWorker(Worker):
    """
    Each worker will create an instance of ``toolbox`` and hang on to it during
    its lifetime. This can be used to pass in a resource such as a persistent
    connections to services that the worker will be using.

    The toolbox factory is called without arguments to produce an instance of
    an object which contains resources necessary for this Worker to perform.
    """
    # TODO: Should a variation of this become the default Worker someday?

    def __init__(self, jobs, toolbox_factory):
        self.toolbox = toolbox_factory()
        Worker.__init__(self, jobs)

    def run(self):
        "Get jobs from the queue and perform them as they arrive."
        while 1:
            job = self.jobs.get()
            try:
                job.run(toolbox=self.toolbox)
                self.jobs.task_done()
            except TerminationNotice:
                self.jobs.task_done()
                break
