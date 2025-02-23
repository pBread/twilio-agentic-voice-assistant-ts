import { EnvManager, sLog } from "./helpers.js";
import Twilio from "twilio";

export async function checkGetTaskrouterSids(env: EnvManager) {
  try {
    sLog.info("checking taskrouter environment");
    const twlo = Twilio(env.vars.TWILIO_API_KEY, env.vars.TWILIO_API_SECRET, {
      accountSid: env.vars.TWILIO_ACCOUNT_SID,
    });

    const workspaces = await twlo.taskrouter.v1.workspaces.list();
    if (!workspaces.length) {
      sLog.warn(
        `no taskrouter workspaces found. env variables must be manually added`,
      );
      return false;
    }
    if (workspaces.length > 1) {
      sLog.warn(
        `unable to configure flex. env variables must be manually added`,
      );
      return false;
    }

    const [ws] = workspaces;

    const workflows = await twlo.taskrouter.v1
      .workspaces(ws.sid)
      .workflows.list();

    if (!workflows.length) {
      sLog.warn(
        `no taskrouter workflows found. env variables must be manually added`,
      );
      return false;
    }
    if (workflows.length > 1) {
      sLog.warn(
        `unable to configure flex. env variables must be manually added`,
      );
      return false;
    }

    const [wf] = workflows;

    const queues = await twlo.taskrouter.v1
      .workspaces(ws.sid)
      .taskQueues.list();

    if (!queues.length) {
      sLog.warn(
        `no taskrouter queues found. env variables must be manually added`,
      );
      return false;
    }
    if (queues.length > 1) {
      sLog.warn(
        `unable to configure flex. env variables must be manually added`,
      );
      return false;
    }

    const [queue] = queues;

    return { workflowSid: wf.sid, workspaceSid: ws.sid, queueSid: queue.sid };
  } catch (error) {
    sLog.error("error trying to fetch taskrouter sids. error: ", error);
    return false;
  }
}
