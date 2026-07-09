import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { NimClientService } from "./nim-client.service";
import { CopilotController } from "./copilot.controller";
import { CopilotService } from "./copilot.service";

@Module({
  controllers: [AiController, CopilotController],
  providers: [AiService, NimClientService, CopilotService],
  exports: [AiService, NimClientService, CopilotService],
})
export class AiModule {}
