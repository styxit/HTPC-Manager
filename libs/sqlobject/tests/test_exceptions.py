from sqlobject import *
from sqlobject.dberrors import DuplicateEntryError
from sqlobject.tests.dbtest import *

########################################
## Table aliases and self-joins
########################################

class TestException(SQLObject):
    name = StringCol(unique=True)

def test_exceptions():
    if not supports("exceptions"):
        return
    setupClass(TestException)
    TestException(name="test")
    raises(DuplicateEntryError, TestException, name="test")
