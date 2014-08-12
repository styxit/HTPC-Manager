#!/usr/bin/env python
# -*- coding: utf-8 -*-

from sqlobject import SQLObject, SQLObjectNotFound
from sqlobject.col import StringCol

class Manageusers(SQLObject):
    """ SQLObject class for users table """
    username = StringCol(default=None, unique=True)
    password = StringCol(default=None)
    role = StringCol(default=None)