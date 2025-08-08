# io-ts-dynamodb

Type-safe codecs for DynamoDB AttributeValue types using io-ts.

## Install

```bash
npm install io-ts io-ts-types io-ts-dynamodb
```

## Usage

```typescript
import * as D from 'io-ts-dynamodb'

// Define a DynamoDB record
const User = D.record({
  id: D.string,
  name: D.string,
  age: D.number
})

const user = { id: '123', name: 'John', age: 30 }

// Encode to DynamoDB format
const encoded = User.encode(user)
// { id: { S: '123' }, name: { S: 'John' }, age: { N: '30' } }

// Decode with validation
const decoded = User.decode(encoded)
// E.right({ id: '123', name: 'John', age: 30 })
```

## Types

- `D.string` - String values
- `D.number` - Numeric values  
- `D.bool` - Boolean values
- `D.stringSet` - String sets
- `D.numberSet` - Number sets
- `D.null` - Null values
- `D.record(props)` - Record structures
- `D.map(codec)` - Nested objects
- `D.list(codec)` - Arrays
