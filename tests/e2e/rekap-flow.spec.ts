import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("mobile@catatz.test");
  await page.getByLabel("Password").fill("mobile-test-password");
  await Promise.all([
    page.waitForResponse((candidate) => candidate.request().method() === "POST"),
    page.getByRole("button", { name: "Masuk", exact: true }).click(),
  ]);
  await expect(page).toHaveURL(/\/transactions$/);
}

test.describe("Rekap Keuangan E2E Flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Rekap Keuangan" })).toBeVisible();
  });

  test("berpindah antar tab Realtime, Bulanan, dan Custom dengan sinkronisasi URL", async ({
    page,
  }) => {
    // Default tab adalah Realtime
    await expect(page.getByRole("tab", { name: "Realtime" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Pindah ke tab Bulanan
    await page.getByRole("tab", { name: "Bulanan" }).click();
    await expect(page).toHaveURL(/\/reports\?tab=bulanan/);
    await expect(page.getByRole("tab", { name: "Bulanan" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Pindah ke tab Custom
    await page.getByRole("tab", { name: "Custom" }).click();
    await expect(page).toHaveURL(/\/reports\?tab=custom/);
    await expect(page.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Kembali ke tab Realtime
    await page.getByRole("tab", { name: "Realtime" }).click();
    await expect(page).toHaveURL(/\/reports\?tab=realtime/);
    await expect(page.getByRole("tab", { name: "Realtime" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  test("membuka dan menyimpan dialog pengaturan siklus rekap", async ({
    page,
  }) => {
    // Buka modal dialog pengaturan rekap
    const settingsBtn = page.getByRole("button", { name: "Pengaturan Rekap" });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Dialog muncul
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pengaturan Rekap" }),
    ).toBeVisible();

    // Verifikasi elemen switch saldo akumulasi
    const switchAkumulasi = dialog.getByRole("switch");
    await expect(switchAkumulasi).toBeVisible();
    await switchAkumulasi.click();

    // Simpan pengaturan
    const saveBtn = dialog.getByRole("button", { name: "Simpan", exact: true });
    await saveBtn.click();

    // Dialog menutup
    await expect(dialog).not.toBeVisible();
  });

  test("membuka halaman detail dari kartu periode dan melakukan drill-down rincian kategori", async ({
    page,
  }) => {
    // Pindah ke tab Bulanan
    await page.getByRole("tab", { name: "Bulanan" }).click();
    await expect(page).toHaveURL(/\/reports\?tab=bulanan/);

    // Tunggu kartu periode muncul di dalam grid
    const firstPeriodCard = page.locator("a[href^='/reports/detail']").first();
    await expect(firstPeriodCard).toBeVisible();

    // Klik kartu periode untuk navigasi ke halaman detail
    await firstPeriodCard.click();
    await expect(page).toHaveURL(/\/reports\/detail\?dari=/);

    // Verifikasi elemen halaman detail
    await expect(page.getByText("Total Pengeluaran")).toBeVisible();
    await expect(page.getByText("Total Pemasukan")).toBeVisible();
    await expect(page.getByText("Selisih Utama").first()).toBeVisible();

    // Verifikasi tab rincian kategori
    const tabKategori = page.getByRole("tab", { name: "Kategori" });
    await expect(tabKategori).toBeVisible();
    await expect(tabKategori).toHaveAttribute("data-state", "active");

    // Jika ada baris breakdown kategori (misalnya Games), lakukan interaksi drill-down
    const breakdownRows = page.locator("[role='tabpanel'] button[aria-expanded]");
    const rowCount = await breakdownRows.count();

    if (rowCount > 0) {
      const firstRow = breakdownRows.first();
      await expect(firstRow).toHaveAttribute("aria-expanded", "false");

      // Klik baris kategori untuk membuka drill-down transaksi
      await firstRow.click();
      await expect(firstRow).toHaveAttribute("aria-expanded", "true");

      // Klik kembali untuk menutup drill-down
      await firstRow.click();
      await expect(firstRow).toHaveAttribute("aria-expanded", "false");
    }

    // Navigasi kembali ke tab bulanan melalui tombol kembali
    const backBtn = page.getByRole("link", { name: "Kembali" });
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await expect(page).toHaveURL(/\/reports\?tab=bulanan/);
  });
});
