import type { ToolDefinition, ToolParameters } from "../types.js";

/****************************************************
 Get User Profile
****************************************************/
const GetProfileParams: ToolParameters = {
  type: "object",
  properties: {
    email: { type: "string", description: "The user's email address" },
    phone: { type: "string", description: "The user's phone" },
  },
  required: [],
};

interface GetProfile {
  email?: string;
  phone?: string;
}

export const getUserByEmailOrPhone: ToolDefinition<GetProfile> = {
  name: "getUserByEmailOrPhone",
  parameters: GetProfileParams,
  type: "function",
  async fn(args: GetProfile, deps) {
    return { name: "Richard", email: "richard@gmail.com" };
  },
};

/****************************************************
 1. Basic String Property
****************************************************/
const SimpleStringParams: ToolParameters = {
  type: "object",
  properties: {
    name: { type: "string", description: "Basic string input" },
  },
  required: ["name"],
};

interface SimpleString {
  name: string;
}

export const simpleStringTool: ToolDefinition<SimpleString> = {
  name: "simpleString",
  description: "Tool with a single required string parameter",
  parameters: SimpleStringParams,
  type: "function",
  async fn(args: SimpleString) {
    return { result: `Hello ${args.name}` };
  },
};

/****************************************************
 2. String with Constraints
****************************************************/
const ConstrainedStringParams: ToolParameters = {
  type: "object",
  properties: {
    password: {
      type: "string",
      description: "Password with length constraints",
      minLength: 8,
      maxLength: 20,
    },
  },
  required: ["password"],
};

interface ConstrainedString {
  password: string;
}

export const constrainedStringTool: ToolDefinition<ConstrainedString> = {
  name: "constrainedString",
  description: "Tool with a length-constrained string parameter",
  parameters: ConstrainedStringParams,
  type: "function",
  async fn(args: ConstrainedString) {
    return { result: "Password validated" };
  },
};

/****************************************************
 3. Number Property
****************************************************/
const NumberParams: ToolParameters = {
  type: "object",
  properties: {
    amount: {
      type: "number",
      description: "Numeric value",
    },
  },
  required: ["amount"],
};

interface NumberParam {
  amount: number;
}

export const numberTool: ToolDefinition<NumberParam> = {
  name: "number",
  description: "Tool with a numeric parameter",
  parameters: NumberParams,
  type: "function",
  async fn(args: NumberParam) {
    return { result: args.amount * 2 };
  },
};

/****************************************************
 4. Simple Array
****************************************************/
const SimpleArrayParams: ToolParameters = {
  type: "object",
  properties: {
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Array of strings",
    },
  },
  required: ["tags"],
};

interface SimpleArray {
  tags: string[];
}

export const arrayTool: ToolDefinition<SimpleArray> = {
  name: "array",
  description: "Tool with an array parameter",
  parameters: SimpleArrayParams,
  type: "function",
  async fn(args: SimpleArray) {
    return { tags: args.tags };
  },
};

/****************************************************
 5. Complex Array with Object Items
****************************************************/
const ComplexArrayParams: ToolParameters = {
  type: "object",
  properties: {
    users: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
      description: "Array of user objects",
    },
  },
  required: ["users"],
};

interface ComplexArray {
  users: Array<{ id: string; name: string }>;
}

export const complexArrayTool: ToolDefinition<ComplexArray> = {
  name: "complexArray",
  description: "Tool with an array of objects parameter",
  parameters: ComplexArrayParams,
  type: "function",
  async fn(args: ComplexArray) {
    return { users: args.users };
  },
};

/****************************************************
 6. Nested Object
****************************************************/
const NestedObjectParams: ToolParameters = {
  type: "object",
  properties: {
    user: {
      type: "object",
      properties: {
        personal: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        },
        preferences: {
          type: "object",
          properties: {
            theme: { type: "string" },
          },
        },
      },
    },
  },
  required: ["user"],
};

interface NestedObject {
  user: {
    personal: {
      name: string;
      age: number;
    };
    preferences: {
      theme: string;
    };
  };
}

export const nestedObjectTool: ToolDefinition<NestedObject> = {
  name: "nestedObject",
  description: "Tool with deeply nested object parameters",
  parameters: NestedObjectParams,
  type: "function",
  async fn(args: NestedObject) {
    return { user: args.user };
  },
};

/****************************************************
 7. Mixed Types with Optional Parameters
****************************************************/
const MixedTypesParams: ToolParameters = {
  type: "object",
  properties: {
    id: { type: "string" },
    count: { type: "number" },
    metadata: {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
  required: ["id"], // Only id is required
};

interface MixedTypes {
  id: string;
  count?: number;
  metadata?: {
    tags: string[];
  };
}

export const mixedTypesTool: ToolDefinition<MixedTypes> = {
  name: "mixedTypes",
  description: "Tool with various optional parameters of different types",
  parameters: MixedTypesParams,
  type: "function",
  async fn(args: MixedTypes) {
    return { ...args };
  },
};

/****************************************************
 8. Request Tool Example
****************************************************/
const RequestToolParams: ToolParameters = {
  type: "object",
  properties: {
    data: {
      type: "object",
      properties: {
        userId: { type: "string" },
        action: { type: "string" },
      },
    },
  },
  required: ["data"],
};

interface RequestData {
  data: {
    userId: string;
    action: string;
  };
}

export const requestTool: ToolDefinition<RequestData> = {
  type: "request",
  name: "requestExample",
  description: "Example of a request tool",
  endpoint: {
    url: "https://api.example.com/action",
    method: "POST",
    contentType: "json",
  },
  parameters: RequestToolParams,
};
