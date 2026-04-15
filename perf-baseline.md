## Performance Baseline and Budgets

### Target Budgets
- LCP <= 2.5s (mobile)
- CLS <= 0.10
- INP <= 200ms
- No horizontal overflow at 320/375/390/768/1024/1280/1440

### Baseline Command Attempts
- `npx --yes http-server . -p 4173`
- `npx --yes lighthouse http://localhost:4173 --quiet --chrome-flags="--headless=new" --preset=desktop --output=json --output-path=".cursor-baseline-lighthouse-desktop.json"`
- `npx --yes lighthouse http://localhost:4173 --quiet --chrome-flags="--headless=new" --preset=perf --form-factor=mobile --screenEmulation.mobile=true --output=json --output-path=".cursor-baseline-lighthouse-mobile.json"`

### Note
Both Lighthouse runs failed in this environment with a Windows temp-folder permission error (`EPERM` removing Lighthouse temp dir). Use the same commands locally in your own terminal session to generate JSON reports for before/after score comparison.

### Manual QA Matrix
- Themes: `neo`, `liquid`, `modern`, `win98`
- Viewports: `320`, `375`, `390`, `768`, `1024`, `1280`, `1440`
- Flows: intro animation, portfolio carousel, quiz launch/progress, theme switch, win98 window actions
