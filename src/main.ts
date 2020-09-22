// Imports here
import CNShell, { HttpError } from "cn-shell";

import { netboxApi } from "./netbox-api";

// Netbox config consts here
const CFG_NETBOX_SERVER = "NETBOX_SERVER";
const CFG_NETBOX_API_KEY = "NETBOX_API_KEY";

// HTTP Prop Patterns here

process.on("unhandledRejection", error => {
  // Will print "unhandledRejection err is not defined"
  console.log("unhandledRejection", error);
});

// CNNetbox class here
class CNNetbox extends CNShell {
  // Properties here
  private _netboxServer: string;
  private _netboxApiKey: string;

  // Constructor here
  constructor(name: string) {
    super(name);

    this._netboxServer = this.getRequiredCfg(CFG_NETBOX_SERVER);
    this._netboxApiKey = this.getRequiredCfg(CFG_NETBOX_API_KEY);
  }

  // Abstract method implementations here
  async start(): Promise<boolean> {
    return true;
  }

  async stop(): Promise<void> {
    return;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Public methods here
  public async get(
    group: string,
    resource: string,
    params: { [key: string]: any },
    id?: string,
  ): Promise<any> {
    if (netboxApi[group] === undefined) {
      throw this.error(`'${group}' is not a valid group`);
    }
    if (netboxApi[group][resource] === undefined) {
      throw this.error(
        `'${resource}' is not a valid resource in group '${group}'`,
      );
    }

    let url = `${this._netboxServer}${netboxApi[group][resource]}`;

    if (id !== undefined) {
      url = `${url}/${id}`;
    }

    let res = await this.httpReq
      .get(url, {
        headers: {
          Authorization: `Token ${this._netboxApiKey}`,
        },
        params,
      })
      .catch(e => {
        let error: HttpError = {
          status: e.response.status,
          message: e.response.data,
        };

        throw error;
      });

    return res.data;
  }

  public async getNext(next: string): Promise<any> {
    if (next === undefined) {
      return undefined;
    }

    let res = await this.httpReq
      .get(next, {
        headers: {
          Authorization: `Token ${this._netboxApiKey}`,
        },
      })
      .catch(e => {
        let error: HttpError = {
          status: e.response.status,
          message: e.response.data,
        };

        throw error;
      });

    return res.data;
  }

  public async getPrevious(previous: string): Promise<any> {
    if (previous === undefined) {
      return undefined;
    }

    let res = await this.httpReq
      .get(previous, {
        headers: {
          Authorization: `Token ${this._netboxApiKey}`,
        },
      })
      .catch(e => {
        let error: HttpError = {
          status: e.response.status,
          message: e.response.data,
        };

        throw error;
      });

    return res.data;
  }
}

export { CNNetbox };
