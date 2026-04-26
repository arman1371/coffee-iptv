export interface DB8SuccessResponse<T = unknown> {
  returnValue: boolean;
  results?: T[];
  count?: number;
  next?: string;
}

export interface DB8ErrorResponse {
  returnValue: boolean;
  errorCode: number;
  errorText: string;
}

export interface DB8Query {
  from: string;
  where?: Array<{
    prop: string;
    op: string;
    val: string | number | boolean;
  }>;
  select?: string[];
  orderBy?: string;
  desc?: boolean;
  limit?: number;
  page?: string;
}

export interface DB8Object {
  _id?: string;
  _kind: string;
  _rev?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface DB8Kind {
  id: string;
  owner: string;
  private?: boolean;
  indexes?: Array<{
    name: string;
    props: Array<{ name: string }>;
  }>;
}

export class DatabaseManager {
  private readonly serviceUri: string;

  constructor(serviceUri: string = "luna://com.palm.db") {
    this.serviceUri = serviceUri;
  }

  /**
   * Returns a set of objects that match the specified query
   * @param query DB8 query object
   * @param count Whether to return total count of results
   * @param watch Whether to watch for changes
   * @returns Promise with query results
   */
  async find(query: DB8Query, count?: boolean): Promise<DB8SuccessResponse> {
    return new Promise((resolve, reject) => {
      const parameters: Record<string, unknown> = { query };

      if (count) {
        parameters.count = count;
      }

      window.webOS.service.request(this.serviceUri, {
        method: "find",
        parameters,
        onSuccess: (response: unknown) => {
          resolve(response as DB8SuccessResponse);
        },
        onFailure: (error: unknown) => {
          reject(error as DB8ErrorResponse);
        },
      });
    });
  }

  /**
   * Stores JSON data objects into the database
   * @param objects Array of objects to store
   * @returns Promise with stored object results (including assigned IDs)
   */
  async put(objects: DB8Object[]): Promise<DB8SuccessResponse> {
    return new Promise((resolve, reject) => {
      window.webOS.service.request(this.serviceUri, {
        method: "put",
        parameters: { objects },
        onSuccess: (response: unknown) => {
          resolve(response as DB8SuccessResponse);
        },
        onFailure: (error: unknown) => {
          reject(error as DB8ErrorResponse);
        },
      });
    });
  }

  /**
   * Registers a kind with the database
   * @param kind The kind definition to register
   * @returns Promise with registration results
   */
  async putKind(kind: DB8Kind): Promise<DB8SuccessResponse> {
    const parameters: { [K in keyof DB8Kind]: DB8Kind[K] } = kind;

    return new Promise((resolve, reject) => {
      window.webOS.service.request(this.serviceUri, {
        method: "putKind",
        parameters,
        onSuccess: (response: unknown) => {
          resolve(response as DB8SuccessResponse);
        },
        onFailure: (error: unknown) => {
          reject(error as DB8ErrorResponse);
        },
      });
    });
  }

  /**
   * Deletes JSON data objects from the database using a query
   * @param query DB8 query specifying objects to delete
   * @returns Promise with deletion results
   */
  async del(query: DB8Query): Promise<DB8SuccessResponse> {
    return new Promise((resolve, reject) => {
      window.webOS.service.request(this.serviceUri, {
        method: "del",
        parameters: { query },
        onSuccess: (response: unknown) => {
          resolve(response as DB8SuccessResponse);
        },
        onFailure: (error: unknown) => {
          reject(error as DB8ErrorResponse);
        },
      });
    });
  }

  /**
   * Utility method to create a basic query object
   * @param kind The kind to query
   * @param whereClause Optional where conditions
   * @returns DB8Query object
   */
  createQuery(
    kind: string,
    whereClause?: Array<{
      prop: string;
      op: string;
      val: string | number | boolean;
    }>
  ): DB8Query {
    const query: DB8Query = { from: kind };

    if (whereClause && whereClause.length > 0) {
      query.where = whereClause;
    }

    return query;
  }

  /**
   * Utility method to create a kind definition
   * @param id Kind ID (should follow format: com.yourdomain.kindname:version)
   * @param owner Owner identifier (app ID or service bus address)
   * @param isPrivate Whether the kind should be removed when app is uninstalled
   * @param indexes Optional indexes for the kind
   * @returns DB8Kind object
   */
  createKind(
    id: string,
    owner: string,
    isPrivate: boolean = true,
    indexes?: Array<{ name: string; props: Array<{ name: string }> }>
  ): DB8Kind {
    const kind: DB8Kind = {
      id,
      owner,
      private: isPrivate,
    };

    if (indexes && indexes.length > 0) {
      kind.indexes = indexes;
    }

    return kind;
  }
}

// Export a singleton instance for easy use
export const dbManager = new DatabaseManager();

// Export default for convenience
export default DatabaseManager;
