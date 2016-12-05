# QueueWrapper.py - Implements Python 2.5 Queue functionality for Python 2.4
# Copyright (c) 2008 Andrey Petrov
#
# This module is part of workerpool and is released under
# the MIT license: http://www.opensource.org/licenses/mit-license.php

# TODO: The extra methods provided here do nothing for now. Add real
# functionality to them someday.

from Queue import Queue as OldQueue

__all__ = ['Queue']


class Queue(OldQueue):
    def task_done(self):
        "Does nothing in Python 2.4"
        pass

    def join(self):
        "Does nothing in Python 2.4"
        pass
