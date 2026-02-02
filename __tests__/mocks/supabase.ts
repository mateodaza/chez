// Mock Supabase client for testing

interface MockSupabaseClient {
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  order: jest.Mock;
  auth: {
    getUser: jest.Mock;
    refreshSession: jest.Mock;
  };
  functions: {
    invoke: jest.Mock;
  };
}

export const mockSupabaseClient: MockSupabaseClient = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null })
    ),
    refreshSession: jest.fn(() =>
      Promise.resolve({
        data: { session: { access_token: "test-token" } },
        error: null,
      })
    ),
  },
  functions: {
    invoke: jest.fn(),
  },
};

// Set up chainable methods to return the client
mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
mockSupabaseClient.upsert.mockReturnValue(mockSupabaseClient);
mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
mockSupabaseClient.single.mockReturnValue(mockSupabaseClient);
mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);

// Reset all mocks
export const resetSupabaseMocks = () => {
  Object.values(mockSupabaseClient).forEach((mock) => {
    if (typeof mock === "function" && "mockClear" in mock) {
      (mock as jest.Mock).mockClear();
    }
  });
};

// Helper to set up mock responses
export const mockSupabaseResponse = (data: unknown, error: unknown = null) => {
  mockSupabaseClient.single.mockResolvedValueOnce({ data, error });
  return mockSupabaseClient;
};

export const mockSupabaseArrayResponse = (
  data: unknown[],
  error: unknown = null
) => {
  // For queries that return arrays (not using .single())
  const mockChain = {
    ...mockSupabaseClient,
    then: (resolve: (value: { data: unknown[]; error: unknown }) => void) => {
      resolve({ data, error });
      return Promise.resolve({ data, error });
    },
  };
  return mockChain;
};
