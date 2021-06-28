// Imports here
import CNShell, { HttpError } from "cn-shell";

import { netboxApi } from "./netbox-api";

import fs from "fs";

// Netbox config consts here
const CFG_NETBOX_SERVER = "NETBOX_SERVER";
const CFG_NETBOX_API_KEY = "NETBOX_API_KEY";

const CFG_DUMP_NETBOX_DATA = "DUMP_NETBOX_DATA";
const CFG_LOAD_NETBOX_DATA = "LOAD_NETBOX_DATA";
const CFG_NETBOX_DATA_DIR = "NETBOX_DATA_DIR";

const DEFAULT_DUMP_NETBOX_DATA = "N"; // Y/y or N/n
const DEFAULT_LOAD_NETBOX_DATA = "N"; // Y/y or N/n
const DEFAULT_NETBOX_DATA_DIR = "/tmp";

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
  private _dumpNetboxData: boolean;
  private _loadNetboxData: boolean;
  private _netboxDataDir: string;

  // Constructor here
  constructor(name: string, master?: CNShell) {
    super(name, master);

    this._netboxServer = this.getRequiredCfg(CFG_NETBOX_SERVER);
    this._netboxApiKey = this.getRequiredCfg(CFG_NETBOX_API_KEY, false, true);

    let dumpNetboxData = this.getCfg(
      CFG_DUMP_NETBOX_DATA,
      DEFAULT_DUMP_NETBOX_DATA,
    );
    if (dumpNetboxData.toUpperCase() === "Y") {
      this._dumpNetboxData = true;
    } else {
      this._dumpNetboxData = false;
    }

    let loadNetboxData = this.getCfg(
      CFG_LOAD_NETBOX_DATA,
      DEFAULT_LOAD_NETBOX_DATA,
    );
    if (loadNetboxData.toUpperCase() === "Y") {
      this._loadNetboxData = true;
    } else {
      this._loadNetboxData = false;
    }

    this._netboxDataDir = this.getCfg(
      CFG_NETBOX_DATA_DIR,
      DEFAULT_NETBOX_DATA_DIR,
    );
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
    params?: { [key: string]: any } | URLSearchParams,
    id?: string,
  ): Promise<{ [key: string]: any }[]> {
    if (netboxApi[group] === undefined) {
      throw this.error(`'${group}' is not a valid group`);
    }
    if (netboxApi[group][resource] === undefined) {
      throw this.error(
        `'${resource}' is not a valid resource in group '${group}'`,
      );
    }

    let path = `${this._netboxDataDir}/netbox-${group}-${resource}.json`;
    let results: { [key: string]: any }[] = [];

    if (this._loadNetboxData) {
      this.info("Loading netbox data from (%s)", path);
      try {
        results = require(path);
      } catch (e) {
        this.error("Path (%s) does not exist!", path);
      }

      return results;
    }

    let url = `${this._netboxServer}${netboxApi[group][resource]}`;

    if (id !== undefined) {
      url = `${url}/${id}`;
    }

    // Loop until there are no more pages of results
    while (true) {
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

      results = results.concat(res.data.results);

      // Check if there are more pages of results
      if (res.data.next !== null) {
        // The next field is a URL but the it is http:// instead of https:// so fix this
        let parts = res.data.next.split("/api/");
        url = `${this._netboxServer}/api/${parts[1]}`;

        // The next field also contains the query paramters so lets clear params
        params = undefined;
      } else {
        // No more data so break out of loop
        break;
      }
    }

    if (this._dumpNetboxData) {
      this.info("Dumping netbox region data to (%s)", path);
      fs.writeFileSync(path, JSON.stringify(results));
    }

    return results;
  }
}

export { CNNetbox };
