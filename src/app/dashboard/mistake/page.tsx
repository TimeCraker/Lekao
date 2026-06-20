import { MistakeWorkflow } from "@/components/mistake/mistake-workflow";
import { isFileSystemAccessSupported } from "@/lib/mistake/fs-access";

export default function MistakePage() {
  // 在服务端渲染时，isFileSystemAccessSupported 返回 false（typeof window === undefined）
  // 客户端 hydration 后会重新计算。这里先返回 false，让组件端做客户端检测。
  const supported = isFileSystemAccessSupported();

  return <MistakeWorkflow isFsAccessSupported={supported} />;
}