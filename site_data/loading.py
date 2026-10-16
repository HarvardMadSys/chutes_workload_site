"""Reading the artifact's Parquet caches into frames.

pandas reads an integer column that holds nulls as float; `with_nullable_integers` gives such a column back its
integer type, with the nulls kept.
"""

import pandas
import pyarrow


def integer_columns(table_schema: pyarrow.Schema) -> list[str]:
    """The integer columns of a Parquet table, named as pandas names them: a struct's fields as `struct.field`."""
    names = []
    for field in table_schema:
        if pyarrow.types.is_struct(field.type):
            for subfield in field.type:
                if pyarrow.types.is_integer(subfield.type):
                    names.append(f"{field.name}.{subfield.name}")
        elif pyarrow.types.is_integer(field.type):
            names.append(field.name)
    return names


def with_nullable_integers(frame: pandas.DataFrame, table_schema: pyarrow.Schema) -> pandas.DataFrame:
    """The frame with each integer column of the Parquet table that arrived as float, because it holds nulls, as
    `Int64`."""
    restored = {}
    for name in integer_columns(table_schema):
        if name in frame.columns and pandas.api.types.is_float_dtype(frame[name]):
            restored[name] = "Int64"
    return frame.astype(restored)
