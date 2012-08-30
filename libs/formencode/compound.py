"""
Validators for applying validations in sequence.
"""

from api import *

# @@ ianb 2005-05: should CompoundValidator be included?
__all__ = ['Any', 'All', 'Pipe']

############################################################
## Compound Validators
############################################################

def to_python(validator, value, state):
    return validator.to_python(value, state)


def from_python(validator, value, state):
    return validator.from_python(value, state)


class CompoundValidator(FancyValidator):

    if_invalid = NoDefault

    validators = []

    __unpackargs__ = ('*', 'validatorArgs')

    __mutableattributes__ = ('validators',)

    def __classinit__(cls, new_attrs):
        toAdd = []
        for name, value in new_attrs.items():
            if name in ('view',):
                continue
            if is_validator(value) and value is not Identity:
                toAdd.append((name, value))
                # @@: Should we really delete too?
                delattr(cls, name)
        toAdd.sort()
        cls.validators.extend([v for n, v in toAdd])

    def __init__(self, *args, **kw):
        Validator.__init__(self, *args, **kw)
        self.validators = self.validators[:]
        self.validators.extend(self.validatorArgs)

    def _reprVars(names):
        return [n for n in Validator._reprVars(names)
                if n != 'validatorArgs']
    _reprVars = staticmethod(_reprVars)

    def attempt_convert(self, value, state, convertFunc):
        raise NotImplementedError, "Subclasses must implement attempt_convert"

    def _to_python(self, value, state=None):
        return self.attempt_convert(value, state,
                                    to_python)
    
    def _from_python(self, value, state=None):
        return self.attempt_convert(value, state,
                                    from_python)

    def subvalidators(self):
        return self.validators


class Any(CompoundValidator):
    """
    This class is like an 'or' operator for validators.  The first
    validator/converter that validates the value will be used.  (You
    can pass in lists of validators, which will be ANDed)
    """

    def attempt_convert(self, value, state, validate):
        lastException = None
        if validate is to_python:
            validators = self.validators[::-1]
        else:
            validators = self.validators
        for validator in validators:
            try:
                return validate(validator, value, state)
            except Invalid, e:
                lastException = e
        if self.if_invalid is NoDefault:
            raise lastException
        else:
            return self.if_invalid

    def not_empty__get(self):
        not_empty = True
        for validator in self.validators:
            not_empty = not_empty and getattr(validator, 'not_empty', False)
        return not_empty
    not_empty = property(not_empty__get)

    def is_empty(self, value):
        # sub-validators should handle emptiness.
        return False


class All(CompoundValidator):
    """
    This class is like an 'and' operator for validators.  All
    validators must work, and the results are passed in turn through
    all validators for conversion.
    """

    def __repr__(self):
        return '<All %s>' % self.validators

    def attempt_convert(self, value, state, validate):
        # To preserve the order of the transformations, we do them
        # differently when we are converting to and from python.
        if validate is to_python:
            validators = list(self.validators)
            validators.reverse()
        else:
            validators = self.validators
        try:
            for validator in validators:
                value = validate(validator, value, state)
            return value
        except Invalid:
            if self.if_invalid is NoDefault:
                raise
            return self.if_invalid

    def with_validator(self, validator):
        """
        Adds the validator (or list of validators) to a copy of
        this validator.
        """
        new = self.validators[:]
        if isinstance(validator, list) or isinstance(validator, tuple):
            new.extend(validator)
        else:
            new.append(validator)
        return self.__class__(*new, **dict(if_invalid=self.if_invalid))

    def join(cls, *validators):
        """
        Joins several validators together as a single validator,
        filtering out None and trying to keep `All` validators from
        being nested (which isn't needed).
        """
        validators = filter(lambda v: v and v is not Identity, validators)
        if not validators:
            return Identity
        if len(validators) == 1:
            return validators[0]
        elif isinstance(validators[0], All):
            return validators[0].with_validator(validators[1:])
        else:
            return cls(*validators)
    join = classmethod(join)

    def if_missing__get(self):
        for validator in self.validators:
            v = validator.if_missing
            if v is not NoDefault:
                return v
        return NoDefault
    if_missing = property(if_missing__get)

    def not_empty__get(self):
        not_empty = False
        for validator in self.validators:
            not_empty = not_empty or getattr(validator, 'not_empty', False)
        return not_empty
    not_empty = property(not_empty__get)

    def is_empty(self, value):
        # sub-validators should handle emptiness.
        return False


class Pipe(All):
    """
    This class works like 'All', all validators muss pass, but the result
    of one validation pass is handled over to the next validator. A behaviour
    known to Unix and GNU users as 'pipe'.

    ::

        >>> from validators import DictConverter
        >>> pv = Pipe(validators=[DictConverter({1: 2}), DictConverter({2: 3}), DictConverter({3: 4})])
        >>> pv.to_python(1)
        4
        >>> pv.to_python(1)
        4
        >>> pv.from_python(4)
        1
        >>> pv.from_python(4)
        1
        >>> pv.to_python(1)
        4

    """

    def __repr__(self):
        return '<Pipe %s>' % self.validators

    def attempt_convert(self, value, state, validate):
        # To preserve the order of the transformations, we do them
        # differently when we are converting to and from Python.
        if validate is from_python:
            validators = list(self.validators)
            validators.reverse()
        else:
            validators = self.validators
        try:
            for validator in validators:
                value = validate(validator, value, state)
            return value
        except Invalid:
            if self.if_invalid is NoDefault:
                raise
            return self.if_invalid
