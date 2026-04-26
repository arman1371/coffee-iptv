import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DatabaseManager,
  dbManager,
  type DB8Object,
  type DB8Query,
  type DB8Kind,
  type DB8SuccessResponse,
  type DB8ErrorResponse,
} from "./database-manager";
import { mockWebOS } from "./test-setup";

describe("DatabaseManager", () => {
  let databaseManager: DatabaseManager;

  beforeEach(() => {
    databaseManager = new DatabaseManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("find method", () => {
    it("should find objects with basic query", async () => {
      const mockQuery: DB8Query = {
        from: "com.test.kind:1",
      };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [
          { _id: "id1", _kind: "com.test.kind:1", name: "test1" },
          { _id: "id2", _kind: "com.test.kind:1", name: "test2" },
        ],
      };

      mockWebOS.service.request.mockImplementation((_service, options) => {
        expect(options.method).toBe("find");
        expect(options.parameters.query).toEqual(mockQuery);
        expect(options.parameters.count).toBeUndefined();
        options.onSuccess(mockResponse);
      });

      const result = await databaseManager.find(mockQuery);

      expect(result).toEqual(mockResponse);
    });

    it("should find objects with count parameters", async () => {
      const mockQuery: DB8Query = {
        from: "com.test.kind:1",
        where: [{ prop: "active", op: "=", val: true }],
      };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [{ _id: "id1", _kind: "com.test.kind:1", active: true }],
        count: 1,
      };

      mockWebOS.service.request.mockImplementation((_service, options) => {
        expect(options.parameters.count).toBe(true);
        options.onSuccess(mockResponse);
      });

      const result = await databaseManager.find(mockQuery, true);

      expect(result).toEqual(mockResponse);
    });
  });

  describe("put method", () => {
    it("should store objects successfully", async () => {
      const mockObjects: DB8Object[] = [
        { _kind: "com.test.kind:1", name: "test1", value: 100 },
        { _kind: "com.test.kind:1", name: "test2", value: 200 },
      ];
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [
          { id: "generated-id-1", rev: 1 },
          { id: "generated-id-2", rev: 1 },
        ],
      };

      mockWebOS.service.request.mockImplementation((_service, options) => {
        expect(options.method).toBe("put");
        expect(options.parameters.objects).toEqual(mockObjects);
        options.onSuccess(mockResponse);
      });

      const result = await databaseManager.put(mockObjects);

      expect(result).toEqual(mockResponse);
    });
  });

  describe("putKind method", () => {
    it("should register kind successfully", async () => {
      const mockKind: DB8Kind = {
        id: "com.test.kind:1",
        owner: "com.test.app",
        private: true,
        indexes: [{ name: "nameIndex", props: [{ name: "name" }] }],
      };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
      };

      mockWebOS.service.request.mockImplementation((_service, options) => {
        expect(options.method).toBe("putKind");
        expect(options.parameters).toEqual(mockKind);
        options.onSuccess(mockResponse);
      });

      const result = await databaseManager.putKind(mockKind);

      expect(result).toEqual(mockResponse);
    });
  });

  describe("utility methods", () => {
    describe("createQuery", () => {
      it("should create basic query without where clause", () => {
        const query = databaseManager.createQuery("com.test.kind:1");

        expect(query).toEqual({
          from: "com.test.kind:1",
        });
      });

      it("should create query with where clause", () => {
        const whereClause = [
          { prop: "name", op: "=", val: "test" },
          { prop: "active", op: "=", val: true },
        ];
        const query = databaseManager.createQuery(
          "com.test.kind:1",
          whereClause
        );

        expect(query).toEqual({
          from: "com.test.kind:1",
          where: whereClause,
        });
      });

      it("should create query without where clause when empty array provided", () => {
        const query = databaseManager.createQuery("com.test.kind:1", []);

        expect(query).toEqual({
          from: "com.test.kind:1",
        });
      });
    });

    describe("createKind", () => {
      it("should create basic kind with default private setting", () => {
        const kind = databaseManager.createKind(
          "com.test.kind:1",
          "com.test.app"
        );

        expect(kind).toEqual({
          id: "com.test.kind:1",
          owner: "com.test.app",
          private: true,
        });
      });

      it("should create kind with custom private setting", () => {
        const kind = databaseManager.createKind(
          "com.test.kind:1",
          "com.test.app",
          false
        );

        expect(kind).toEqual({
          id: "com.test.kind:1",
          owner: "com.test.app",
          private: false,
        });
      });

      it("should create kind with indexes", () => {
        const indexes = [
          { name: "nameIndex", props: [{ name: "name" }] },
          {
            name: "compoundIndex",
            props: [{ name: "category" }, { name: "priority" }],
          },
        ];
        const kind = databaseManager.createKind(
          "com.test.kind:1",
          "com.test.app",
          true,
          indexes
        );

        expect(kind).toEqual({
          id: "com.test.kind:1",
          owner: "com.test.app",
          private: true,
          indexes,
        });
      });

      it("should create kind without indexes when empty array provided", () => {
        const kind = databaseManager.createKind(
          "com.test.kind:1",
          "com.test.app",
          true,
          []
        );

        expect(kind).toEqual({
          id: "com.test.kind:1",
          owner: "com.test.app",
          private: true,
        });
      });
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton dbManager instance", () => {
      expect(dbManager).toBeInstanceOf(DatabaseManager);
    });

    it("should use the same instance across imports", () => {
      const anotherRef = dbManager;
      expect(anotherRef).toBe(dbManager);
    });
  });

  describe("error handling", () => {
    it("should handle service errors properly in all methods", async () => {
      const mockError: DB8ErrorResponse = {
        errorCode: 500,
        errorText: "Service unavailable",
        returnValue: false,
      };

      // Test each method's error handling
      const methods = [
        () => databaseManager.find({ from: "kind" }),
        () => databaseManager.put([{ _kind: "kind" }]),
        () => databaseManager.putKind({ id: "kind", owner: "owner" }),
      ];

      for (const method of methods) {
        mockWebOS.service.request.mockImplementation((_service, options) => {
          options.onFailure(mockError);
        });

        await expect(method()).rejects.toEqual(mockError);
      }
    });
  });

  describe("parameter validation", () => {
    it("should handle various data types in query values", () => {
      const query = databaseManager.createQuery("com.test.kind:1", [
        { prop: "stringProp", op: "=", val: "string" },
        { prop: "numberProp", op: ">", val: 42 },
        { prop: "booleanProp", op: "=", val: true },
      ]);

      expect(query.where).toEqual([
        { prop: "stringProp", op: "=", val: "string" },
        { prop: "numberProp", op: ">", val: 42 },
        { prop: "booleanProp", op: "=", val: true },
      ]);
    });
  });

  describe("del method", () => {
    it("should delete objects with query", async () => {
      const mockQuery: DB8Query = {
        from: "com.test.kind:1",
      };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        count: 3,
      };

      mockWebOS.service.request.mockImplementation((_service, options) => {
        expect(options.method).toBe("del");
        expect(options.parameters.query).toEqual(mockQuery);
        options.onSuccess(mockResponse);
      });

      const result = await databaseManager.del(mockQuery);

      expect(result).toEqual(mockResponse);
    });

    it("should handle del errors", async () => {
      const mockQuery: DB8Query = {
        from: "com.test.kind:1",
      };
      const mockError: DB8ErrorResponse = {
        errorCode: -3963,
        errorText: "db: permission denied",
        returnValue: false,
      };

      mockWebOS.service.request.mockImplementation((_service, options) => {
        options.onFailure(mockError);
      });

      await expect(databaseManager.del(mockQuery)).rejects.toEqual(mockError);
    });
  });

  describe("constructor serviceUri", () => {
    it("should use default serviceUri when not specified", async () => {
      const defaultManager = new DatabaseManager();
      const mockQuery: DB8Query = { from: "com.test.kind:1" };

      mockWebOS.service.request.mockImplementation((service, options) => {
        expect(service).toBe("luna://com.palm.db");
        options.onSuccess({ returnValue: true, results: [] });
      });

      await defaultManager.find(mockQuery);
    });

    it("should use custom serviceUri when specified", async () => {
      const mediaManager = new DatabaseManager("luna://com.webos.mediadb");
      const mockQuery: DB8Query = { from: "com.test.kind:1" };

      mockWebOS.service.request.mockImplementation((service, options) => {
        expect(service).toBe("luna://com.webos.mediadb");
        options.onSuccess({ returnValue: true, results: [] });
      });

      await mediaManager.find(mockQuery);
    });
  });

  describe("method chaining and integration", () => {
    it("should work with realistic database workflow", async () => {
      // Create kind
      const kind = databaseManager.createKind(
        "com.iptv.channels:1",
        "com.iptv.app"
      );

      mockWebOS.service.request.mockImplementation((_service, options) => {
        if (options.method === "putKind") {
          options.onSuccess({ returnValue: true });
        }
      });

      await databaseManager.putKind(kind);

      // Create objects
      const objects: DB8Object[] = [
        {
          _kind: "com.iptv.channels:1",
          name: "Channel 1",
          url: "http://stream1.com",
        },
        {
          _kind: "com.iptv.channels:1",
          name: "Channel 2",
          url: "http://stream2.com",
        },
      ];

      mockWebOS.service.request.mockImplementation((_service, options) => {
        if (options.method === "put") {
          options.onSuccess({
            returnValue: true,
            results: [
              { id: "ch1", rev: 1 },
              { id: "ch2", rev: 1 },
            ],
          });
        }
      });

      await databaseManager.put(objects);

      // Query objects
      const query = databaseManager.createQuery("com.iptv.channels:1", [
        { prop: "name", op: "=", val: "Channel 1" },
      ]);

      mockWebOS.service.request.mockImplementation((_service, options) => {
        if (options.method === "find") {
          options.onSuccess({
            returnValue: true,
            results: [
              {
                _id: "ch1",
                _kind: "com.iptv.channels:1",
                name: "Channel 1",
                url: "http://stream1.com",
              },
            ],
          });
        }
      });

      const result = await databaseManager.find(query);

      expect(result.returnValue).toBe(true);
      if ("results" in result) {
        expect(result.results).toHaveLength(1);
      } else {
        throw new Error(`Unexpected error response: ${JSON.stringify(result)}`);
      }
    });
  });
});
