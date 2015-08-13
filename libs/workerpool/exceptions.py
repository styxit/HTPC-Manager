# exceptions.py - Exceptions used in the operation of a worker pool
# Copyright (c) 2008 Andrey Petrov
#
# This module is part of workerpool and is released under
# the MIT license: http://www.opensource.org/licenses/mit-license.php


class TerminationNotice(Exception):
    "This exception is raised inside a thread when it's time for it to die."
    pass
