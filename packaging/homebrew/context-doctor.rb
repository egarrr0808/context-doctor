class ContextDoctor < Formula
  desc "Analyze and optimize LLM context windows"
  homepage "https://github.com/context-doctor/context-doctor"
  url "https://registry.npmjs.org/context-doctor/-/context-doctor-0.1.0.tgz"
  sha256 "REPLACE_WITH_NPM_TARBALL_SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args(prefix: false), "."
    bin.install_symlink libexec/"bin/context-doctor"
  end

  test do
    assert_match "context-doctor", shell_output("#{bin}/context-doctor --help")
  end
end
