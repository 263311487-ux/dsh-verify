# First browser check / 首次浏览器验收

From this directory / 在本目录运行：

    npx playwright install chromium
    npx dsh-verify --spec dsh-verify.spec.json
    # PASS (5/5): dsh-verify-out/report.html
    npx dsh-verify --spec dsh-verify.fail.json --out failed-report
    # Expected FAIL (4/5), exit 1: failed-report/report.html

Open the HTML report beside its PNG image. The failing spec deliberately expects wrong text; it demonstrates a failed assertion, not a broken app. Both checks run on localhost with no API key. Package/browser installation needs internet once. The init command itself creates files only.

打开 HTML 报告时保留同级 PNG 图片。失败清单故意断言错误文字，展示验收失败，不代表网页有故障。两份清单仅访问本机，无需 API key；首次安装包与浏览器需要网络，init 本身只创建文件。

Edit the JSON steps to check your app. The serve path is relative to the directory where the command runs; replace it with base for an existing URL. A PASS applies only to the supplied checks in that run; it does not establish complete coverage, security, accessibility, or independent authorship. Review AI-generated checks before treating them as acceptance criteria.

修改 JSON 步骤即可验收自己的应用。serve 相对于执行命令的当前目录；已有网址使用 base 替代。PASS 仅说明本次清单内检查通过，不证明覆盖完整、安全、无障碍或规范作者独立。AI 生成清单需人工审核。
