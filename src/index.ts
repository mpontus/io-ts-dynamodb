/**
 * ```ts
 * interface DynamoDbType<K, A, I> extends Type<A, AttributeValue, I> {}
 * ```
 *
 * `io-ts-dynamodb` provides codecs for encoding and decoding DynamoDB
 * AttributeValue types using the io-ts library. It enables type-safe
 * serialization and deserialization of TypeScript values to and from DynamoDB's
 * native format.
 *
 * @since 0.0.1
 */
import type { AttributeValue } from '@aws-sdk/client-dynamodb'
import { constTrue } from 'fp-ts/lib/function'
import * as ord from 'fp-ts/lib/Ord'
import * as t from 'io-ts'
import { mapOutput, NumberFromString, setFromArray } from 'io-ts-types'
import * as E from 'fp-ts/lib/Either'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Base class for DynamoDB attribute value types.
 *
 * @since 0.0.1
 * @category Model
 */
export class DynamoDbType<
  K extends keyof AttributeValue,
  A,
  I = unknown
> extends t.Type<A, AttributeValue, I> {
  constructor(
    name: string,
    key: K,
    codec: t.Type<A, AttributeValue[K], unknown>
  ) {
    super(
      name,
      codec.is,
      (i: I) => {
        // First check if the input has the expected key
        if (typeof i !== 'object' || i === null || !(key in i)) {
          return E.left([
            {
              value: i,
              context: [{ key: '', type: this, actual: i }],
              message: `Expected object with key ${String(key)}`,
            },
          ])
        }

        // Then decode the value using the inner codec
        const val = (i as Record<string, unknown>)[key]
        return codec.decode(val)
      },
      (val) => ({ [key]: codec.encode(val) } as unknown as AttributeValue)
    )
  }
}

// -------------------------------------------------------------------------------------
// primitive types
// -------------------------------------------------------------------------------------

/**
 * DynamoDB String type codec.
 *
 * @since 0.0.1
 * @category Primitives
 * @example
 *   import * as D from 'io-ts-dynamodb'
 *
 *   const encoded = D.string.encode('hello')
 *   // { S: 'hello' }
 *
 *   const decoded = D.string.decode({ S: 'world' })
 *   // E.right('world')
 */
export const string = new DynamoDbType('DynamoDbString', 'S', t.string)

/**
 * DynamoDB Number type codec.
 *
 * @since 0.0.1
 * @category Primitives
 * @example
 *   import * as D from 'io-ts-dynamodb'
 *
 *   const encoded = D.number.encode(42)
 *   // { N: '42' }
 *
 *   const decoded = D.number.decode({ N: '123' })
 *   // E.right(123)
 */
export const number = new DynamoDbType('DynamoDbNumber', 'N', NumberFromString)

/**
 * DynamoDB Boolean type codec.
 *
 * @since 0.0.1
 * @category Primitives
 * @example
 *   import * as D from 'io-ts-dynamodb'
 *
 *   const encoded = D.bool.encode(true)
 *   // { BOOL: true }
 *
 *   const decoded = D.bool.decode({ BOOL: false })
 *   // E.right(false)
 */
export const bool = new DynamoDbType('DynamoDbBool', 'BOOL', t.boolean)

/**
 * DynamoDB String Set type codec.
 *
 * @since 0.0.1
 * @category Primitives
 * @example
 *   import * as D from 'io-ts-dynamodb'
 *
 *   const encoded = D.stringSet.encode(new Set(['a', 'b', 'c']))
 *   // { SS: ['a', 'b', 'c'] }
 *
 *   const decoded = D.stringSet.decode({ SS: ['x', 'y'] })
 *   // E.right(Set {'x', 'y'})
 */
export const stringSet = new DynamoDbType(
  'DynamoDbStringSet',
  'SS',
  setFromArray(t.string, ord.ordString)
)

/**
 * DynamoDB Number Set type codec.
 *
 * @since 0.0.1
 * @category Primitives
 * @example
 *   import * as D from 'io-ts-dynamodb'
 *
 *   const encoded = D.numberSet.encode(new Set([1, 2, 3]))
 *   // { NS: ['1', '2', '3'] }
 *
 *   const decoded = D.numberSet.decode({ NS: ['10', '20'] })
 *   // E.right(Set {10, 20})
 */
export const numberSet = new DynamoDbType(
  'DynamoDbNumberSet',
  'NS',
  setFromArray(NumberFromString, ord.ordNumber)
)

/**
 * DynamoDB Null type codec.
 *
 * @since 0.0.1
 * @category Primitives
 * @example
 *   import * as D from 'io-ts-dynamodb'
 *
 *   const encoded = D.null.encode(null)
 *   // { NULL: true }
 *
 *   const decoded = D.null.decode({ NULL: true })
 *   // E.right(null)
 */
const nullType = new DynamoDbType(
  'DynamoDbNull',
  'NULL',
  mapOutput(t.null, constTrue)
)

/** @ignore */
export { nullType as null }

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * Creates a DynamoDB Map type codec from an inner codec.
 *
 * @since 0.0.1
 * @category Combinators
 * @example
 *   import * as D from 'io-ts-dynamodb'
 *   import * as t from 'io-ts'
 *
 *   const userMap = D.map(D.string)
 *   const encoded = userMap.encode({ name: 'John', city: 'NYC' })
 *   // { M: { name: { S: 'John' }, city: { S: 'NYC' } } }
 */
export const map = <A, O extends AttributeValue, I>(
  codec: t.Type<A, O, unknown>
): DynamoDbType<'M', Record<string, A>, I> =>
  new DynamoDbType(`DynamoDbMap<${codec.name}>`, 'M', t.record(t.string, codec))

/**
 * Creates a DynamoDB List type codec from an inner codec.
 *
 * @since 0.0.1
 * @category Combinators
 * @example
 *   import * as D from 'io-ts-dynamodb'
 *   import * as t from 'io-ts'
 *
 *   const stringList = D.list(D.string)
 *   const encoded = stringList.encode(['hello', 'world'])
 *   // { L: [{ S: 'hello' }, { S: 'world' }] }
 */
export const list = <A, O extends AttributeValue, I>(
  codec: t.Type<A, O, unknown>
): DynamoDbType<'L', A[], I> =>
  new DynamoDbType(`DynamoDbList<${codec.name}>`, 'L', t.array(codec))

/**
 * Creates a codec for a record of AttributeValues (can be used for DynamoDB
 * items or nested objects).
 *
 * @since 0.0.1
 * @category Combinators
 * @example
 *   import * as D from 'io-ts-dynamodb'
 *   import * as t from 'io-ts'
 *
 *   const User = D.record({
 *     id: D.string,
 *     name: D.string,
 *     age: D.number,
 *     active: D.bool,
 *   })
 *
 *   const user = { id: '123', name: 'John', age: 30, active: true }
 *   const encoded = User.encode(user)
 *   // { id: { S: '123' }, name: { S: 'John' }, age: { N: '30' }, active: { BOOL: true } }
 */
export const record = <
  P extends Record<string, t.Type<unknown, AttributeValue, unknown>>
>(
  properties: P
): t.Type<
  { [K in keyof P]: t.TypeOf<P[K]> },
  Record<string, AttributeValue>,
  unknown
> => {
  const propertyCodecs = t.type(properties)
  return new t.Type(
    `DynamoDbRecord<{${Object.keys(properties).join(', ')}}>`,
    propertyCodecs.is,
    propertyCodecs.decode,
    (a) => {
      const result: Record<string, AttributeValue> = {}
      for (const key of Object.keys(properties)) {
        const prop = properties[key]
        if (prop) {
          result[key] = prop.encode(a[key])
        }
      }
      return result
    }
  )
}
