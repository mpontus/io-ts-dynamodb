import * as D from '../src'
import * as E from 'fp-ts/Either'
import * as fc from 'fast-check'

describe('io-ts-dynamodb', () => {
  it('basic codecs', () => {
    // String
    expect(D.string.encode('hello')).toEqual({ S: 'hello' })
    expect(D.string.decode({ S: 'world' })).toEqual(E.right('world'))
    
    // Number
    expect(D.number.encode(42)).toEqual({ N: '42' })
    expect(D.number.decode({ N: '123' })).toEqual(E.right(123))
    
    // Boolean
    expect(D.bool.encode(true)).toEqual({ BOOL: true })
    expect(D.bool.decode({ BOOL: false })).toEqual(E.right(false))
    
    // String Set
    const set = new Set(['a', 'b'])
    expect(D.stringSet.encode(set)).toEqual({ SS: ['a', 'b'] })
    expect(D.stringSet.decode({ SS: ['x', 'y'] })).toEqual(E.right(new Set(['x', 'y'])))
  })

  it('record codec', () => {
    const User = D.record({
      id: D.string,
      name: D.string,
      age: D.number
    })

    const user = { id: '123', name: 'John', age: 30 }
    const encoded = User.encode(user)
    
    expect(encoded).toEqual({
      id: { S: '123' },
      name: { S: 'John' },
      age: { N: '30' }
    })
    
    expect(User.decode(encoded)).toEqual(E.right(user))
  })

  it('roundtrip properties', () => {
    fc.assert(fc.property(fc.string(), (str) => {
      const encoded = D.string.encode(str)
      const decoded = D.string.decode(encoded)
      expect(decoded).toEqual(E.right(str))
    }))

    fc.assert(fc.property(fc.integer(), (num) => {
      const encoded = D.number.encode(num)
      const decoded = D.number.decode(encoded)
      expect(decoded).toEqual(E.right(num))
    }))
  })
})
