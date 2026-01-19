import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Plus, User, ArrowLeft, Edit, Pencil, Image as ImageIcon, X, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";

// 薬歴カレンダーコンポーネント
function MedicationCalendar({ medications }: { medications: any[] }) {
  const [viewMode, setViewMode] = useState<"日" | "週" | "月">("日");
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // 全ての薬歴から日付範囲を計算（過去と未来の両方向に拡張）
  const { minDate, maxDate } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // デフォルト範囲：過去1年から未来1年
    const defaultMinDate = new Date(today);
    defaultMinDate.setFullYear(today.getFullYear() - 1);
    const defaultMaxDate = new Date(today);
    defaultMaxDate.setFullYear(today.getFullYear() + 1);
    
    if (medications.length === 0) {
      return { minDate: defaultMinDate, maxDate: defaultMaxDate };
    }
    
    // 薬歴の最小開始日と最大終了日を取得
    let medMin = new Date(medications[0].startDate);
    let medMax = medications[0].endDate ? new Date(medications[0].endDate) : new Date();
    
    medications.forEach(med => {
      const start = new Date(med.startDate);
      const end = med.endDate ? new Date(med.endDate) : new Date();
      if (start < medMin) medMin = new Date(start);
      if (end > medMax) medMax = new Date(end);
    });

    // 薬歴の範囲とデフォルト範囲の両方を含める
    const min = medMin < defaultMinDate ? medMin : defaultMinDate;
    const max = medMax > defaultMaxDate ? medMax : defaultMaxDate;
    
    // さらに余裕を持たせる（過去2年、未来2年）
    const extendedMin = new Date(min);
    extendedMin.setFullYear(min.getFullYear() - 1);
    const extendedMax = new Date(max);
    extendedMax.setFullYear(max.getFullYear() + 1);

    return { minDate: extendedMin, maxDate: extendedMax };
  }, [medications]);

  // 表示単位に応じて日付カラムを生成
  const allDates = useMemo(() => {
    if (medications.length === 0) return [];
    
    const dates: Array<{ date: Date; dateStr: string; display: string; startDate: Date; endDate: Date }> = [];
    const current = new Date(minDate);
    
    if (viewMode === "日") {
      // 日単位で表示
      while (current <= maxDate) {
        const dateStr = current.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".");
        const display = `${String(current.getMonth() + 1).padStart(2, '0')}/${String(current.getDate()).padStart(2, '0')}`;
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);
        dates.push({ date: new Date(current), dateStr, display, startDate: dayStart, endDate: dayEnd });
        current.setDate(current.getDate() + 1);
      }
    } else if (viewMode === "週") {
      // 週単位で表示（月曜日始まり）
      const startOfWeek = new Date(current);
      const dayOfWeek = startOfWeek.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 月曜日に調整
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      // 月の第何週かを計算する関数
      const getWeekOfMonth = (date: Date): number => {
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstMonday = new Date(firstDayOfMonth);
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const diffToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
        firstMonday.setDate(firstDayOfMonth.getDate() + diffToMonday);
        
        // 週の開始日が月の1日より前の場合は、次の週からカウント
        if (firstMonday < firstDayOfMonth) {
          firstMonday.setDate(firstMonday.getDate() + 7);
        }
        
        const weekNumber = Math.floor((date.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        return weekNumber;
      };
      
      while (startOfWeek <= maxDate) {
        const weekEnd = new Date(startOfWeek);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        const dateStr = startOfWeek.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".");
        const month = startOfWeek.getMonth() + 1;
        const weekNumber = getWeekOfMonth(startOfWeek);
        const display = `${month}月\n${weekNumber}週`;
        dates.push({ date: new Date(startOfWeek), dateStr, display, startDate: new Date(startOfWeek), endDate: weekEnd });
        startOfWeek.setDate(startOfWeek.getDate() + 7);
      }
    } else if (viewMode === "月") {
      // 月単位で表示
      current.setDate(1); // 月初めに設定
      current.setHours(0, 0, 0, 0);
      
      while (current <= maxDate) {
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        const dateStr = current.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".");
        const year = current.getFullYear();
        const month = current.getMonth() + 1;
        const display = `${year}年\n${month}月`;
        dates.push({ date: new Date(current), dateStr, display, startDate: new Date(current), endDate: monthEnd });
        current.setMonth(current.getMonth() + 1);
      }
    }

    return dates;
  }, [medications, minDate, maxDate, viewMode]);

  // 薬剤ごとに日付範囲を計算
  const medicationRanges = useMemo(() => {
    return medications.map(med => {
      const start = new Date(med.startDate);
      // 終了日がnullの場合は、カレンダーの最大日付まで表示（未来も含む）
      const end = med.endDate ? new Date(med.endDate) : new Date(maxDate);
      const startStr = start.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".");
      const endStr = end.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".");
      
      return {
        ...med,
        startDateStr: startStr,
        endDateStr: endStr,
        startDateObj: start,
        endDateObj: end,
        hasEndDate: !!med.endDate, // 終了日があるかどうかのフラグ
      };
    });
  }, [medications, maxDate]);

  // 日付が範囲内かどうかをチェック（期間の重複を確認）
  const isDateInRange = (periodStart: Date, periodEnd: Date, medStart: Date, medEnd: Date) => {
    // 期間の開始日が薬の終了日より後、または期間の終了日が薬の開始日より前の場合は重複なし
    if (periodStart > medEnd || periodEnd < medStart) {
      return false;
    }
    return true;
  };

  // 今日の日付に該当するカラムのインデックスを取得
  const todayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allDates.findIndex(dateCol => {
      return today >= dateCol.startDate && today <= dateCol.endDate;
    });
  }, [allDates]);

  // 初期表示時とviewMode変更時に今日の日付付近にスクロール
  useEffect(() => {
    if (calendarRef.current && todayIndex >= 0) {
      // 少し遅延させてからスクロール（レンダリング完了後）
      const timer = setTimeout(() => {
        const scrollContainer = calendarRef.current;
        if (scrollContainer) {
          // 今日の日付のカラムを中央付近に表示
          const cellWidth = 60; // カラムの最小幅
          const containerWidth = scrollContainer.clientWidth;
          const scrollPosition = todayIndex * cellWidth - containerWidth / 2 + cellWidth / 2;
          scrollContainer.scrollLeft = Math.max(0, scrollPosition);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [todayIndex, viewMode]);

  if (allDates.length === 0) {
    return <p className="text-center text-muted-foreground py-8">表示する日付がありません</p>;
  }

  return (
    <div className="space-y-4">
      {/* 表示単位切り替えタブ */}
      <div className="flex items-center gap-2">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "日" | "週" | "月")}>
          <TabsList>
            <TabsTrigger value="日">日単位</TabsTrigger>
            <TabsTrigger value="週">週単位</TabsTrigger>
            <TabsTrigger value="月">月単位</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* カレンダーテーブル */}
      <div ref={calendarRef} className="overflow-x-auto" style={{ scrollBehavior: 'smooth' }}>
        <div className="inline-block min-w-full">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2">
                <th className="sticky left-0 z-10 bg-muted/95 backdrop-blur-sm p-3 text-left font-semibold border-r border-b-2 min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                  薬剤名
                </th>
                {allDates.map((dateCol, index) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isToday = today >= dateCol.startDate && today <= dateCol.endDate;
                  
                  return (
                    <th 
                      key={dateCol.dateStr} 
                      className={`p-2 text-center font-semibold border-r border-b-2 backdrop-blur-sm min-w-[60px] ${
                        isToday ? 'bg-primary/20 border-primary/50' : 'bg-muted/95'
                      }`}
                    >
                      <div className="whitespace-pre-line leading-tight">
                        {dateCol.display}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {medicationRanges.map((med) => (
                <tr key={med.id} className="hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 z-10 bg-background p-3 font-medium border-r min-w-[200px] whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                    {med.medicationName}
                  </td>
                  {allDates.map((dateCol) => {
                    const isInRange = isDateInRange(dateCol.startDate, dateCol.endDate, med.startDateObj, med.endDateObj);
                    // 開始日がこの期間内にあるかチェック
                    const isStartInPeriod = med.startDateObj >= dateCol.startDate && med.startDateObj <= dateCol.endDate;
                    
                    // 今日の日付かどうかをチェック
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isToday = today >= dateCol.startDate && today <= dateCol.endDate;
                    
                    return (
                      <td 
                        key={dateCol.dateStr} 
                        className={`p-1 text-center border-r relative ${
                          isInRange ? 'bg-blue-200' : ''
                        } ${
                          isToday ? 'border-l-2 border-r-2 border-primary' : ''
                        }`}
                        style={{ minWidth: '60px' }}
                      >
                        {isStartInPeriod && (
                          <div className="w-2 h-2 bg-black rounded-full mx-auto" title={`開始: ${med.startDateObj.toLocaleDateString("ja-JP")}`}></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

type TestResultMatrix = {
  [itemId: number]: {
    item: any;
    results: { [date: string]: any };
  };
};

// 身体測定の項目リスト
const PHYSICAL_MEASUREMENT_ITEMS = [
  "身長",
  "体重",
  "BMI",
  "腹囲",
  "体脂肪率",
  "除脂肪率",
  "基礎代謝量",
];

// 画像の項目リスト
const IMAGE_ITEMS = [
  "甲状腺エコー",
  "安静時心電図",
  "胸部X線",
  "CTR(心胸郭比)",
  "胸部CT",
  "腹部エコー（肝臓所見）",
  "腹部エコー（胆嚢所見）",
  "腹部エコー（すい臓所見）",
  "腹部エコー（腎臓所見）",
  "腹部エコー（脾臓所見）",
  "腹部エコー（腹部大動脈）",
  "経腟エコー（子宮）",
  "経腟エコー（卵巣）",
  "骨盤MRI",
  "マンモグラフィー右",
  "マンモグラフィー左",
  "乳腺エコー右",
  "乳腺エコー左",
];

// 項目を大カテゴリに分類する関数
function categorizeItem(itemName: string): "身体測定" | "画像" | "検査結果" {
  if (PHYSICAL_MEASUREMENT_ITEMS.includes(itemName)) {
    return "身体測定";
  }
  if (IMAGE_ITEMS.includes(itemName)) {
    return "画像";
  }
  return "検査結果";
}

export default function PatientDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const patientId = Number(params.id);
  const [mainCategory, setMainCategory] = useState<"身体測定" | "検査結果" | "画像">("身体測定");
  const [selectedPhysicalItem, setSelectedPhysicalItem] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isAddResultOpen, setIsAddResultOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isEditResultOpen, setIsEditResultOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [showUnit, setShowUnit] = useState(true);
  const [showReference, setShowReference] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // "__all__" = 全て（フィルタなし）
  const [selectedMatrixCategory, setSelectedMatrixCategory] = useState<string>("__all__");
  const hasInitializedDates = useRef(false);
  const categoryInitializedDates = useRef<Set<"身体測定" | "検査結果" | "画像">>(new Set());

  const { data: patientData, isLoading: patientLoading } = trpc.patients.get.useQuery({ id: patientId });
  const { data: allResults, isLoading: resultsLoading, refetch: refetchResults } = trpc.testResults.list.useQuery({ 
    patientId
  });
  const { data: testItems, isLoading: testItemsLoading, error: testItemsError } = trpc.testItems.list.useQuery();
  const { data: doctors } = trpc.doctors.list.useQuery();
  const { data: medications, isLoading: medicationsLoading, refetch: refetchMedications, error: medicationsError } = trpc.medications.list.useQuery({ patientId });
  
  // デバッグ用ログ
  useEffect(() => {
    if (medications) {
      console.log('[PatientDetail] Medications data:', medications);
      console.log('[PatientDetail] Medications count:', medications.length);
    }
    if (medicationsError) {
      console.error('[PatientDetail] Medications error:', medicationsError);
    }
  }, [medications, medicationsError]);
  
  // デバッグ用ログ: testItems
  useEffect(() => {
    console.log('[PatientDetail] testItems state:', {
      isLoading: testItemsLoading,
      hasData: !!testItems,
      dataLength: testItems?.length || 0,
      error: testItemsError,
      isArray: Array.isArray(testItems),
      firstItem: testItems?.[0],
      categories: testItems ? Array.from(new Set(testItems.map(item => item.category))) : [],
      data: testItems
    });
    
    if (testItems && testItems.length > 0) {
      console.log('[PatientDetail] testItems sample (first 5):', testItems.slice(0, 5));
      console.log('[PatientDetail] testItems categories:', Array.from(new Set(testItems.map(item => item.category))));
    } else if (testItems && testItems.length === 0) {
      console.warn('[PatientDetail] testItems is an empty array!');
    } else if (!testItems && !testItemsLoading && !testItemsError) {
      console.warn('[PatientDetail] testItems is undefined/null and not loading');
    }
  }, [testItems, testItemsLoading, testItemsError]);
  
  // 初期カテゴリを設定
  useEffect(() => {
    if (testItems && testItems.length > 0 && selectedCategory === null) {
      const categoryOrder = [
        "身体",
        "脳・血管",
        "肺機能",
        "血圧",
        "血液",
        "脂質代謝",
        "糖代謝",
        "腎・尿路系",
        "肝胆膵",
        "内分泌",
        "口腔",
        "診察",
        "循環器",
        "呼吸器",
        "消化器",
        "生殖器",
        "乳がん",
        "腫瘍マーカー",
        "感染症・免疫",
      ];
      
      const sortedCategories = Array.from(new Set(testItems.map(item => item.category)))
        .sort((a, b) => {
          const indexA = categoryOrder.indexOf(a);
          const indexB = categoryOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        })
        .filter(cat => {
          const categoryItems = testItems.filter(item => item.category === cat);
          return categoryItems.length > 0;
        });
      
      if (sortedCategories.length > 0) {
        setSelectedCategory(sortedCategories[0]);
      }
    }
  }, [testItems, selectedCategory]);
  const createTestResultMutation = trpc.testResults.bulkCreate.useMutation();
  const updatePatientMutation = trpc.patients.update.useMutation();
  const updateTestResultMutation = trpc.testResults.update.useMutation();
  const deleteTestResultMutation = trpc.testResults.delete.useMutation();
  const createMedicationMutation = trpc.medications.create.useMutation();
  const [isAddMedicationOpen, setIsAddMedicationOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedImageItem, setSelectedImageItem] = useState<{ itemId: number; date: string } | null>(null);
  const utils = trpc.useUtils();
  
  // 画像データを取得（選択された項目のみ）
  const { data: images, refetch: refetchImages } = trpc.testResultImages.list.useQuery(
    {
      patientId,
      itemId: selectedImageItem?.itemId || 0,
      testDate: selectedImageItem?.date ? selectedImageItem.date.replace(/\./g, "-") : undefined,
    },
    { enabled: !!selectedImageItem }
  );
  
  const uploadImageMutation = trpc.testResultImages.upload.useMutation();
  const deleteImageMutation = trpc.testResultImages.delete.useMutation();
  
  // 全ての画像データを取得（画像の有無を表示するため）
  const { data: allImages } = trpc.testResultImages.list.useQuery(
    {
      patientId,
      itemId: 0, // 全ての項目を取得するため、0を指定（バックエンドで修正が必要な場合は後で対応）
    },
    { enabled: mainCategory === "画像" }
  );
  
  // 画像の有無をマッピング
  const imageMap = useMemo(() => {
    const map = new Map<string, boolean>(); // key: "itemId-date"
    if (allImages) {
      allImages.forEach(img => {
        const dateStr = new Date(img.testDate).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".");
        map.set(`${img.itemId}-${dateStr}`, true);
      });
    }
    return map;
  }, [allImages]);

  // フックは早期リターンの前に呼び出す必要がある
  // 大カテゴリでフィルタリング
  const filteredResults = useMemo(() => {
    if (!allResults) return [];
    return allResults.filter(r => {
      const itemName = r.item?.itemName || "";
      const itemCategory = categorizeItem(itemName);
      return itemCategory === mainCategory;
    });
  }, [allResults, mainCategory]);

  // マトリックスに表示する検査項目（未入力も含めて表示するため、結果ではなく testItems を基準にする）
  const matrixBaseItems = useMemo(() => {
    if (!testItems) return [];
    return testItems.filter(item => categorizeItem(item.itemName) === mainCategory);
  }, [testItems, mainCategory]);

  const matrixCategories = useMemo(() => {
    if (mainCategory !== "検査結果") return [];
    const cats = Array.from(new Set(matrixBaseItems.map(i => i.category).filter(Boolean)));
    return cats.sort((a, b) => a.localeCompare(b));
  }, [mainCategory, matrixBaseItems]);

  const { matrix, sortedDates } = useMemo(() => {
    const matrixData: TestResultMatrix = {};
    const allDates = new Set<string>();

    // 日付は、画像タブでは全検査日の列を出したい（画像項目は testResults に存在しないことが多い）
    // それ以外は、この大カテゴリ内に存在する結果から作る（カテゴリ選択で日付列が消えないようにする）
    const dateSourceResults = mainCategory === "画像" ? (allResults ?? []) : filteredResults;
    dateSourceResults.forEach(r => {
      const dateStr = new Date(r.result.testDate)
        .toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
        .replace(/\//g, ".");
      allDates.add(dateStr);
    });

    // 行（検査項目）は testItems を基準に作成し、未入力でも表示する
    const itemsForMatrix =
      mainCategory === "検査結果" && selectedMatrixCategory !== "__all__"
        ? matrixBaseItems.filter(i => i.category === selectedMatrixCategory)
        : matrixBaseItems;

    itemsForMatrix.forEach(item => {
      matrixData[item.id] = { item, results: {} };
    });

    // 既存結果をマトリックスへ反映
    filteredResults.forEach(r => {
      const dateStr = new Date(r.result.testDate)
        .toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
        .replace(/\//g, ".");
      const row = matrixData[r.result.itemId];
      if (row) {
        row.results[dateStr] = r.result;
      }
    });

    const sorted = Array.from(allDates).sort((a, b) => {
      const [aY, aM, aD] = a.split(".").map(Number);
      const [bY, bM, bD] = b.split(".").map(Number);
      return new Date(aY, aM - 1, aD).getTime() - new Date(bY, bM - 1, bD).getTime();
    });

    return { matrix: matrixData, sortedDates: sorted };
  }, [allResults, filteredResults, mainCategory, matrixBaseItems, selectedMatrixCategory]);

  // 選択された日付のみをフィルタリング
  const displayedDates = useMemo(() => {
    return sortedDates.filter(date => selectedDates.has(date));
  }, [sortedDates, selectedDates]);

  const toggleDate = (date: string) => {
    const newSelectedDates = new Set(selectedDates);
    if (newSelectedDates.has(date)) {
      newSelectedDates.delete(date);
    } else {
      newSelectedDates.add(date);
    }
    setSelectedDates(newSelectedDates);
  };

  const selectAllDates = () => {
    setSelectedDates(new Set(sortedDates));
  };

  const deselectAllDates = () => {
    setSelectedDates(new Set());
  };

  const sortedItems = useMemo(() => {
    return Object.entries(matrix).sort(([, a], [, b]) => {
      return (a.item?.displayOrder || 0) - (b.item?.displayOrder || 0);
    });
  }, [matrix]);

  // カテゴリの「帯（見出し行）」を挿入するための行リスト
  const groupedSortedItems = useMemo(() => {
    type ItemRow = { type: "item"; itemId: string; data: any };
    type CategoryRow = { type: "category"; category: string };
    type Row = ItemRow | CategoryRow;

    const items: ItemRow[] = sortedItems.map(([itemId, data]) => ({
      type: "item",
      itemId,
      data,
    }));

    const getCategory = (data: any) => (data?.item?.category ? String(data.item.category) : "その他");

    const grouped = new Map<string, ItemRow[]>();
    for (const row of items) {
      const cat = getCategory(row.data);
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(row);
    }

    // カテゴリ順：検査結果タブはマスタ由来のカテゴリ順、その他は名称順
    const catsFromItems = Array.from(grouped.keys());
    const fallbackCats = catsFromItems.slice().sort((a, b) => a.localeCompare(b));

    const baseOrder =
      mainCategory === "検査結果"
        ? selectedMatrixCategory !== "__all__"
          ? [selectedMatrixCategory]
          : matrixCategories.length > 0
            ? matrixCategories
            : fallbackCats
        : fallbackCats;

    // baseOrder に載っていないカテゴリ（例: その他）も末尾に追加
    const orderedCats = [
      ...baseOrder.filter(cat => grouped.has(cat)),
      ...fallbackCats.filter(cat => !baseOrder.includes(cat)),
    ];

    const rows: Row[] = [];
    for (const cat of orderedCats) {
      const catItems = grouped.get(cat);
      if (!catItems || catItems.length === 0) continue;
      rows.push({ type: "category", category: cat });
      rows.push(...catItems);
    }
    return rows;
  }, [sortedItems, mainCategory, matrixCategories, selectedMatrixCategory]);

  // 身体測定の項目リストを取得
  const physicalMeasurementItems = useMemo(() => {
    if (!allResults || !testItems) return [];
    const items = new Map<number, { item: any; results: { [date: string]: any } }>();
    
    allResults.forEach(r => {
      const itemName = r.item?.itemName || "";
      if (PHYSICAL_MEASUREMENT_ITEMS.includes(itemName)) {
        const itemId = r.result.itemId;
        if (!items.has(itemId)) {
          items.set(itemId, { item: r.item, results: {} });
        }
        const dateStr = new Date(r.result.testDate).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".");
        items.get(itemId)!.results[dateStr] = r.result;
      }
    });
    
    return Array.from(items.entries()).sort(([, a], [, b]) => {
      const aName = a.item?.itemName || "";
      const bName = b.item?.itemName || "";
      const aIndex = PHYSICAL_MEASUREMENT_ITEMS.indexOf(aName);
      const bIndex = PHYSICAL_MEASUREMENT_ITEMS.indexOf(bName);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [allResults, testItems]);

  // 身体測定画面で身長をデフォルト表示
  useEffect(() => {
    if (mainCategory === "身体測定" && physicalMeasurementItems.length > 0) {
      // 身長の項目を探す
      const heightItem = physicalMeasurementItems.find(([, data]) => {
        const itemName = data.item?.itemName || "";
        return itemName === "身長";
      });
      if (heightItem && selectedPhysicalItem !== "身長") {
        setSelectedPhysicalItem("身長");
      } else if (!heightItem && physicalMeasurementItems.length > 0 && selectedPhysicalItem === null) {
        // 身長がない場合は最初の項目を選択
        const firstItem = physicalMeasurementItems[0];
        if (firstItem) {
          const itemName = firstItem[1].item?.itemName || "";
          setSelectedPhysicalItem(itemName);
        }
      }
    }
  }, [mainCategory, physicalMeasurementItems, selectedPhysicalItem]);

  // 検査結果画面と画像画面で全日程をデフォルト選択
  useEffect(() => {
    if ((mainCategory === "検査結果" || mainCategory === "画像") && sortedDates.length > 0) {
      // このカテゴリでまだ初期化していない場合は全日程を選択
      if (!categoryInitializedDates.current.has(mainCategory)) {
        setSelectedDates(new Set(sortedDates));
        categoryInitializedDates.current.add(mainCategory);
      }
    }
  }, [mainCategory, sortedDates]);

  // 選択された身体測定項目のグラフデータを生成
  const physicalMeasurementChartData = useMemo(() => {
    if (!selectedPhysicalItem || !physicalMeasurementItems.length) return [];
    
    const itemData = physicalMeasurementItems.find(([, data]) => data.item?.itemName === selectedPhysicalItem);
    if (!itemData) return [];
    
    const [, data] = itemData;
    const chartData: Array<{ date: string; value: number }> = [];
    
    sortedDates.forEach(date => {
      const result = data.results[date];
      if (result && result.resultValue != null) {
        const numValue = Number(result.resultValue);
        if (!isNaN(numValue)) {
          chartData.push({
            date,
            value: numValue,
          });
        }
      }
    });
    
    return chartData.sort((a, b) => {
      const [aY, aM, aD] = a.date.split(".").map(Number);
      const [bY, bM, bD] = b.date.split(".").map(Number);
      return new Date(aY, aM - 1, aD).getTime() - new Date(bY, bM - 1, bD).getTime();
    });
  }, [selectedPhysicalItem, physicalMeasurementItems, sortedDates]);

  // 身体測定項目の単位を取得
  const selectedPhysicalItemUnit = useMemo(() => {
    if (!selectedPhysicalItem || !physicalMeasurementItems.length) return "";
    const itemData = physicalMeasurementItems.find(([, data]) => data.item?.itemName === selectedPhysicalItem);
    return itemData ? itemData[1].item?.unit || "" : "";
  }, [selectedPhysicalItem, physicalMeasurementItems]);

  if (patientLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!patientData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">患者が見つかりません</p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />TOPページに戻る
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const patient = patientData.patient;
  const doctor = patientData.doctor;

  const handleAddResult = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!testItems) {
      toast.error("検査項目が読み込まれていません");
      return;
    }

    const testDate = formData.get("testDate") as string;
    if (!testDate) {
      toast.error("検査日を入力してください");
      return;
    }

    try {
      const results: Array<{ itemId: number; resultValue: string; resultComment?: string }> = [];
      const imageUploadPromises: Promise<void>[] = [];
      
      for (const item of testItems) {
        const isImageItem = IMAGE_ITEMS.includes(item.itemName);
        
        if (isImageItem) {
          // 画像項目の場合は画像アップロード処理
          const imageInput = e.currentTarget.querySelector(`#image_${item.id}`) as HTMLInputElement;
          if (imageInput && imageInput.files && imageInput.files.length > 0) {
            const files = Array.from(imageInput.files);
            for (const file of files) {
              const promise = (async () => {
                try {
                  // ファイルをbase64に変換
                  const reader = new FileReader();
                  const base64Data = await new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });
                  
                  await uploadImageMutation.mutateAsync({
                    patientId,
                    itemId: item.id,
                    testDate: testDate,
                    fileData: base64Data,
                    fileName: file.name,
                    mimeType: file.type,
                  });
                } catch (error: any) {
                  toast.error(`${item.itemName}の画像アップロードに失敗しました: ${error.message}`);
                  throw error;
                }
              })();
              imageUploadPromises.push(promise);
            }
          }
        } else {
          // 通常の検査結果項目
          const value = formData.get(`item_${item.id}`) as string;
          if (value && value.trim() !== "") {
            results.push({
              itemId: item.id,
              resultValue: value.trim(),
              resultComment: undefined,
            });
          }
        }
      }
      
      // 数値結果と画像アップロードを並列で実行
      const promises: Promise<any>[] = [];
      
      if (results.length > 0) {
        promises.push(
          createTestResultMutation.mutateAsync({
            patientId,
            testDate,
            results,
          })
        );
      }
      
      if (imageUploadPromises.length > 0) {
        promises.push(...imageUploadPromises);
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
        const resultCount = results.length;
        const imageCount = imageUploadPromises.length;
        let successMessage = "";
        if (resultCount > 0 && imageCount > 0) {
          successMessage = `${resultCount}件の検査結果と${imageCount}枚の画像を登録しました`;
        } else if (resultCount > 0) {
          successMessage = `${resultCount}件の検査結果を登録しました`;
        } else if (imageCount > 0) {
          successMessage = `${imageCount}枚の画像を登録しました`;
        }
        toast.success(successMessage);
        setIsAddResultOpen(false);
        refetchResults();
        // 画像データも再取得（フォーム登録は画像タブ以外から行われることが多いので無条件でキャッシュを無効化）
        await utils.testResultImages.list.invalidate();
        // フォームをリセット
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error("少なくとも1つの検査項目に値を入力するか、画像を選択してください");
      }
    } catch (error: any) {
      toast.error(error.message || "登録に失敗しました");
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await updatePatientMutation.mutateAsync({
        id: patientId,
        patientId: formData.get("patientId") as string || undefined,
        name: formData.get("name") as string || undefined,
        nameKana: formData.get("nameKana") as string || undefined,
        gender: formData.get("gender") as "男" | "女" | "その他" || undefined,
        birthDate: formData.get("birthDate") as string || undefined,
        phone: formData.get("phone") as string || undefined,
        email: formData.get("email") as string || undefined,
        address: formData.get("address") as string || undefined,
        doctorId: formData.get("doctorId") ? Number(formData.get("doctorId")) : undefined,
        status: formData.get("status") as "契約中" | "終了" | "新規" || undefined,
        notes: formData.get("notes") as string || undefined,
      });
      
      toast.success("患者情報を更新しました");
      setIsEditPatientOpen(false);
      await utils.patients.get.invalidate({ id: patientId });
    } catch (error: any) {
      toast.error(error.message || "更新に失敗しました");
    }
  };

  const handleUpdateResults = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDate || !allResults) return;
    
    const formData = new FormData(e.currentTarget);

    try {
      if (!testItems) {
        toast.error("検査項目が読み込まれていません");
        return;
      }

      // 編集対象の日付（bulkCreate に渡す用）
      const targetDateStr = editingDate.replace(/\./g, "-"); // "YYYY-MM-DD"

      // 編集対象（未入力も含め、検査結果カテゴリの全検査項目）
      const editableItems = testItems.filter(item => categorizeItem(item.itemName) === "検査結果");

      // 既存結果（この日付）のインデックス
      const formatDateForComparison = (date: Date | string) => {
        const d = typeof date === "string" ? new Date(date) : date;
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
      };
      const existingByItemId = new Map<number, any>();
      allResults.forEach(r => {
        if (categorizeItem(r.item?.itemName || "") !== "検査結果") return;
        const dateStr = formatDateForComparison(r.result.testDate);
        if (dateStr !== editingDate) return;
        existingByItemId.set(r.result.itemId, r.result);
      });

      const updatePromises: Promise<any>[] = [];
      const deletePromises: Promise<any>[] = [];
      const createResults: Array<{ itemId: number; resultValue: string; resultComment?: string }> = [];

      for (const item of editableItems) {
        const raw = formData.get(`item_${item.id}`);
        const value = typeof raw === "string" ? raw.trim() : "";
        const existing = existingByItemId.get(item.id);

        // 空欄の場合：既存があれば削除（未入力状態に戻す）
        if (value === "") {
          if (existing) {
            deletePromises.push(deleteTestResultMutation.mutateAsync({ id: existing.id }));
          }
          continue;
        }

        // 値の簡易バリデーション（bulkCreate は数値以外を弾く）
        if (Number.isNaN(Number(value))) {
          toast.error(`数値として解釈できない値があります: ${item.itemName} = "${value}"`);
          return;
        }

        // 既存があれば更新、なければ新規作成
        if (existing) {
          updatePromises.push(
            updateTestResultMutation.mutateAsync({
              id: existing.id,
              resultValue: value,
            })
          );
        } else {
          createResults.push({
            itemId: item.id,
            resultValue: value,
            resultComment: undefined,
          });
        }
      }

      await Promise.all([...updatePromises, ...deletePromises]);

      if (createResults.length > 0) {
        await createTestResultMutation.mutateAsync({
          patientId,
          testDate: targetDateStr,
          results: createResults,
        });
      }
      
      toast.success("検査結果を更新しました");
      setIsEditResultOpen(false);
      setEditingDate(null);
      refetchResults();
    } catch (error: any) {
      toast.error(error.message || "更新に失敗しました");
    }
  };

  // 患者の性別に応じて適切な基準値を取得する関数
  const getReferenceValues = (item: any) => {
    if (!item) return { refMin: null, refMax: null };
    
    const gender = patient?.gender || "その他";
    
    // 性別別の基準値が設定されている場合はそれを使用
    if (gender === "女" && item.referenceMinFemale != null && item.referenceMaxFemale != null) {
      return { refMin: item.referenceMinFemale, refMax: item.referenceMaxFemale };
    } else if ((gender === "男" || gender === "その他") && item.referenceMinMale != null && item.referenceMaxMale != null) {
      return { refMin: item.referenceMinMale, refMax: item.referenceMaxMale };
    }
    
    // 性別別の基準値が設定されていない場合は共通基準値を使用
    return { refMin: item.referenceMin, refMax: item.referenceMax };
  };

  const getCellColor = (value: string | null | undefined, item: any, itemName?: string) => {
    // デバッグ用ログ（開発環境のみ）
    const DEBUG = import.meta.env.DEV;
    
    // 値が存在しない場合は色分けしない
    if (!value || value === "-" || (typeof value === "string" && value.trim() === "")) {
      if (DEBUG) console.log(`[getCellColor] ${itemName || 'Unknown'}: 値が空`, { value });
      return "";
    }
    
    const { refMin, refMax } = getReferenceValues(item);
    
    // 基準値が両方とも存在しない場合は色分けしない
    const hasRefMin = refMin != null && refMin !== "-" && refMin !== "null" && String(refMin).trim() !== "";
    const hasRefMax = refMax != null && refMax !== "-" && refMax !== "null" && String(refMax).trim() !== "";
    if (!hasRefMin && !hasRefMax) {
      if (DEBUG) console.log(`[getCellColor] ${itemName || 'Unknown'}: 基準値なし`, { value, refMin, refMax });
      return "";
    }
    
    // 数値に変換（文字列の前後の空白を除去）
    const cleanValue = String(value).trim();
    const numValue = Number(cleanValue);
    if (isNaN(numValue)) {
      if (DEBUG) console.log(`[getCellColor] ${itemName || 'Unknown'}: 数値変換失敗`, { value: cleanValue, refMin, refMax });
      return "";
    }
    
    // 基準値下限のチェック（低値 = 青）
    if (hasRefMin) {
      const minValue = Number(String(refMin).trim());
      if (!isNaN(minValue) && numValue < minValue) {
        if (DEBUG) console.log(`[getCellColor] ${itemName || 'Unknown'}: 低値検出 (青)`, { value: numValue, refMin: minValue });
        return "bg-blue-200 text-blue-900 font-semibold";
      }
    }
    
    // 基準値上限のチェック（高値 = 赤）
    if (hasRefMax) {
      const maxValue = Number(String(refMax).trim());
      if (!isNaN(maxValue) && numValue > maxValue) {
        if (DEBUG) console.log(`[getCellColor] ${itemName || 'Unknown'}: 高値検出 (赤)`, { value: numValue, refMax: maxValue });
        return "bg-red-200 text-red-900 font-semibold";
      }
    }
    
    if (DEBUG) console.log(`[getCellColor] ${itemName || 'Unknown'}: 基準値内`, { value: numValue, refMin, refMax });
    return "";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">患者詳細（患者軸カルテ）</h1>
              <p className="text-muted-foreground mt-2">{patient.name} ({patient.patientId})</p>
            </div>
          </div>
          <Button onClick={() => setIsAddResultOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />検査結果追加
          </Button>
        </div>

        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>基本情報</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditPatientOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />編集
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">患者ID</p>
              <p className="font-mono font-medium">{patient.patientId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">氏名</p>
              <p className="font-medium">{patient.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">性別</p>
              <p>{patient.gender}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">年齢</p>
              <p>{calculateAge(new Date(patient.birthDate))}歳</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">生年月日</p>
              <p>{new Date(patient.birthDate).toLocaleDateString("ja-JP")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">顧問医師</p>
              <p>{doctor?.name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ステータス</p>
              <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                patient.status === "契約中" ? "bg-green-100 text-green-800" :
                patient.status === "終了" ? "bg-gray-100 text-gray-800" :
                "bg-blue-100 text-blue-800"
              }`}>
                {patient.status || "新規"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant">
          <CardHeader>
            <CardTitle>検査結果マトリックス</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={mainCategory} onValueChange={(value) => {
              const newCategory = value as "身体測定" | "検査結果" | "画像";
              setMainCategory(newCategory);
              // 身体測定に切り替えた場合は選択をリセット（身長が自動選択される）
              if (newCategory === "身体測定") {
                setSelectedPhysicalItem(null);
              }
              // 検査結果または画像に切り替えた場合は、そのカテゴリの初期化フラグをリセット
              // useEffectでsortedDatesが更新されたときに全日程が選択される
              if (newCategory === "検査結果" || newCategory === "画像") {
                categoryInitializedDates.current.delete(newCategory);
              }
            }}>
              <div className="mb-4 overflow-x-auto -mx-1 px-1">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="身体測定" className="whitespace-nowrap">身体測定</TabsTrigger>
                  <TabsTrigger value="検査結果" className="whitespace-nowrap">検査結果</TabsTrigger>
                  <TabsTrigger value="画像" className="whitespace-nowrap">画像</TabsTrigger>
                </TabsList>
              </div>

              {/* 身体測定タブ */}
              <TabsContent value="身体測定">
                {resultsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : physicalMeasurementItems.length > 0 ? (
                  <div className="flex gap-4 h-[calc(100vh-400px)] min-h-[600px]">
                    {/* 項目選択パネル（左側） */}
                    <div className="w-64 flex-shrink-0 border rounded-lg p-4 bg-muted/30 flex flex-col">
                      <h3 className="font-semibold text-sm mb-3">項目選択</h3>
                      <div className="space-y-2 flex-1 overflow-y-auto mb-4 pr-1">
                        {physicalMeasurementItems.map(([itemId, data]) => {
                          const itemName = data.item?.itemName || "";
                          const isSelected = selectedPhysicalItem === itemName;
                          return (
                            <div
                              key={itemId}
                              className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                              }`}
                              onClick={() => setSelectedPhysicalItem(itemName)}
                            >
                              <span className="text-sm">{itemName}</span>
                              {data.item?.unit && (
                                <span className="text-xs text-muted-foreground">({data.item.unit})</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* グラフ表示エリア（右側） */}
                    <div className="flex-1 flex flex-col min-w-0">
                      {selectedPhysicalItem ? (
                        physicalMeasurementChartData.length > 0 ? (
                          <div className="flex-1 border rounded-lg bg-background p-6">
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold">
                                {selectedPhysicalItem}
                                {selectedPhysicalItemUnit && ` (${selectedPhysicalItemUnit})`}
                              </h3>
                            </div>
                            <ChartContainer
                              config={{
                                value: {
                                  label: selectedPhysicalItem,
                                  color: "#3b82f6",
                                },
                              }}
                              className="h-[500px] w-full"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={physicalMeasurementChartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    stroke="#6b7280"
                                  />
                                  <YAxis 
                                    tick={{ fontSize: 12 }}
                                    label={{ value: selectedPhysicalItemUnit, angle: -90, position: "insideLeft" }}
                                    stroke="#6b7280"
                                  />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Line 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3}
                                    dot={{ r: 5, fill: "#3b82f6" }}
                                    activeDot={{ r: 7, fill: "#2563eb" }}
                                    connectNulls={false}
                                  >
                                    <LabelList 
                                      dataKey="value" 
                                      position="top" 
                                      style={{ fill: "#1e40af", fontSize: "12px", fontWeight: "500" }}
                                      formatter={(value: number) => value.toLocaleString()}
                                    />
                                  </Line>
                                </LineChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </div>
                        ) : (
                          <div className="flex-1 border rounded-lg bg-background flex items-center justify-center">
                            <p className="text-muted-foreground">データがありません</p>
                          </div>
                        )
                      ) : (
                        <div className="flex-1 border rounded-lg bg-background flex items-center justify-center">
                          <p className="text-muted-foreground">左側から項目を選択してください</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">身体測定のデータがありません</p>
                )}
              </TabsContent>

              {/* 検査結果タブ */}
              <TabsContent value="検査結果">
                {resultsLoading || testItemsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : sortedItems.length > 0 && sortedDates.length > 0 ? (
                  <div className="flex gap-4 h-[calc(100vh-400px)] min-h-[600px]">
                    {/* 日付選択パネル（左側） */}
                    <div className="w-64 flex-shrink-0 border rounded-lg p-4 bg-muted/30 flex flex-col">
                      {/* カテゴリ選択 */}
                      <div className="mb-4">
                        <Label className="text-sm font-semibold">カテゴリ</Label>
                        <div className="mt-2">
                          <Select
                            value={selectedMatrixCategory}
                            onValueChange={(value) => {
                              setSelectedMatrixCategory(value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="カテゴリを選択" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">全て</SelectItem>
                              {matrixCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">日付選択</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={selectAllDates}
                          >
                            全選択
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={deselectAllDates}
                          >
                            全解除
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 flex-1 overflow-y-auto mb-4 pr-1">
                        {sortedDates.map((date) => (
                          <div
                            key={date}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => toggleDate(date)}
                          >
                            <Checkbox
                              checked={selectedDates.has(date)}
                              onCheckedChange={() => toggleDate(date)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <label
                              className="text-sm cursor-pointer flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDate(date);
                              }}
                            >
                              {date}
                            </label>
                          </div>
                        ))}
                      </div>
                      {/* 表示オプション */}
                      <div className="border-t pt-4 space-y-2 flex-shrink-0">
                        <h3 className="font-semibold text-sm mb-2">表示オプション</h3>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showUnit"
                            checked={showUnit}
                            onCheckedChange={(checked) => setShowUnit(checked === true)}
                          />
                          <label htmlFor="showUnit" className="text-sm cursor-pointer">
                            単位を表示
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showReference"
                            checked={showReference}
                            onCheckedChange={(checked) => setShowReference(checked === true)}
                          />
                          <label htmlFor="showReference" className="text-sm cursor-pointer">
                            基準値を表示
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* テーブル（右側） */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex-1 overflow-auto border rounded-lg bg-background">
                        <div className="inline-block min-w-full align-middle">
                          <table className="w-full border-collapse text-sm">
                            <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm">
                              <tr className="border-b-2">
                                <th className="sticky left-0 z-30 bg-muted/95 backdrop-blur-sm p-3 text-left font-semibold border-r border-b-2 min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                                  検査項目
                                </th>
                                {showUnit && (
                                  <th className="sticky left-[200px] z-20 bg-muted/95 backdrop-blur-sm p-2 text-center font-semibold border-r border-b-2 w-16 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                                    単位
                                  </th>
                                )}
                                {showReference && (
                                  <th className={`sticky ${showUnit ? 'left-[264px]' : 'left-[200px]'} z-20 bg-muted/95 backdrop-blur-sm p-2 text-center font-semibold border-r border-b-2 w-24 shadow-[2px_0_4px_rgba(0,0,0,0.1)]`}>
                                    基準値
                                  </th>
                                )}
                                {displayedDates.map((date) => (
                                  <th 
                                    key={date} 
                                    className="p-3 text-center font-semibold border-r border-b-2 bg-muted/95 backdrop-blur-sm relative group min-w-[120px]"
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="whitespace-nowrap">{date}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('Edit button clicked, date:', date);
                                          setEditingDate(date);
                                          setIsEditResultOpen(true);
                                        }}
                                        title="この日のデータを編集"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-background divide-y divide-border">
                              {groupedSortedItems.map((row) => {
                                const colSpan = 1 + (showUnit ? 1 : 0) + (showReference ? 1 : 0) + displayedDates.length;

                                if (row.type === "category") {
                                  return (
                                    <tr key={`cat-${row.category}`}>
                                      <td
                                        colSpan={colSpan}
                                        className="bg-muted/60 text-foreground font-semibold px-3 py-2"
                                      >
                                        {row.category}
                                      </td>
                                    </tr>
                                  );
                                }

                                const { itemId, data } = row;

                                return (
                                  <tr key={itemId} className="hover:bg-muted/20 transition-colors">
                                    <td className="sticky left-0 z-10 bg-background p-3 font-medium border-r min-w-[200px] whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                                      {data.item?.itemName || "-"}
                                    </td>
                                    {showUnit && (
                                      <td className="sticky left-[200px] z-10 bg-background p-2 text-center text-muted-foreground border-r text-xs shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                                        {data.item?.unit || "-"}
                                      </td>
                                    )}
                                    {showReference && (
                                      <td className={`sticky ${showUnit ? 'left-[264px]' : 'left-[200px]'} z-10 bg-background p-2 text-center text-xs text-muted-foreground border-r whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.1)]`}>
                                        {(() => {
                                          const { refMin, refMax } = getReferenceValues(data.item);
                                          if (refMin != null && refMax != null) {
                                            return `${refMin}~${refMax}`;
                                          } else if (refMin != null) {
                                            return `≥${refMin}`;
                                          } else if (refMax != null) {
                                            return `≤${refMax}`;
                                          }
                                          return "-";
                                        })()}
                                      </td>
                                    )}
                                    {displayedDates.map((date) => {
                                      const result = data.results[date];
                                      const resultValueStr = result && result.resultValue != null ? String(result.resultValue) : null;
                                      const cellColor = result ? getCellColor(
                                        resultValueStr,
                                        data.item,
                                        data.item?.itemName // デバッグ用に項目名を渡す
                                      ) : "";

                                      // 基準値を取得して文字列に変換
                                      const { refMin, refMax } = getReferenceValues(data.item);
                                      const refMinStr = refMin != null ? String(refMin).trim() : null;
                                      const refMaxStr = refMax != null ? String(refMax).trim() : null;

                                      // デバッグ用: 基準値がある場合のみ詳細ログ（基準値外の場合は必ずログ出力）
                                      if (import.meta.env.DEV && result && refMinStr && refMaxStr) {
                                        const numValue = Number(resultValueStr);
                                        const minValue = Number(refMinStr);
                                        const maxValue = Number(refMaxStr);
                                        const isOutOfRange = !isNaN(numValue) && !isNaN(minValue) && !isNaN(maxValue) &&
                                          (numValue < minValue || numValue > maxValue);

                                        // 基準値外の場合は必ずログ出力、基準値内の場合は10%の確率でログ出力
                                        if (isOutOfRange || Math.random() < 0.1) {
                                          console.log('Cell Debug Info:', {
                                            itemName: data.item?.itemName,
                                            date,
                                            resultValue: result.resultValue,
                                            resultValueStr,
                                            resultValueType: typeof result.resultValue,
                                            numValue,
                                            referenceMin: data.item?.referenceMin,
                                            refMinStr,
                                            referenceMinType: typeof data.item?.referenceMin,
                                            minValue,
                                            referenceMax: data.item?.referenceMax,
                                            refMaxStr,
                                            referenceMaxType: typeof data.item?.referenceMax,
                                            maxValue,
                                            isOutOfRange,
                                            cellColor,
                                            'cellColor length': cellColor.length,
                                            'hasRefMin': !!refMinStr,
                                            'hasRefMax': !!refMaxStr
                                          });
                                        }
                                      }

                                      return (
                                        <td
                                          key={date}
                                          className={`p-3 text-center border-r ${cellColor} cursor-pointer hover:bg-muted/30 transition-colors`}
                                          onClick={() => {
                                            setEditingDate(date);
                                            setIsEditResultOpen(true);
                                          }}
                                          title="クリックして編集"
                                        >
                                          {result ? result.resultValue : "-"}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">検査結果がありません</p>
                )}
              </TabsContent>

              {/* 画像タブ */}
              <TabsContent value="画像">
                {resultsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : sortedItems.length > 0 && sortedDates.length > 0 ? (
                  <div className="flex gap-4 h-[calc(100vh-400px)] min-h-[600px]">
                    {/* 日付選択パネル（左側） */}
                    <div className="w-64 flex-shrink-0 border rounded-lg p-4 bg-muted/30 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">日付選択</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={selectAllDates}
                          >
                            全選択
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={deselectAllDates}
                          >
                            全解除
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 flex-1 overflow-y-auto mb-4 pr-1">
                        {sortedDates.map((date) => (
                          <div
                            key={date}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => toggleDate(date)}
                          >
                            <Checkbox
                              checked={selectedDates.has(date)}
                              onCheckedChange={() => toggleDate(date)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <label
                              className="text-sm cursor-pointer flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDate(date);
                              }}
                            >
                              {date}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* テーブル（右側） */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex-1 overflow-auto border rounded-lg bg-background">
                        <div className="inline-block min-w-full align-middle">
                          <table className="w-full border-collapse text-sm">
                            <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm">
                              <tr className="border-b-2">
                                <th className="sticky left-0 z-30 bg-muted/95 backdrop-blur-sm p-3 text-left font-semibold border-r border-b-2 min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                                  検査項目
                                </th>
                                {displayedDates.map((date) => (
                                  <th 
                                    key={date} 
                                    className="p-3 text-center font-semibold border-r border-b-2 bg-muted/95 backdrop-blur-sm min-w-[120px]"
                                  >
                                    <span className="whitespace-nowrap">{date}</span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-background divide-y divide-border">
                              {(() => {
                                // 画像項目を取得（データがなくても表示）
                                const imageItemIds = new Set<number>();
                                if (testItems) {
                                  testItems.forEach(item => {
                                    if (IMAGE_ITEMS.includes(item.itemName)) {
                                      imageItemIds.add(item.id);
                                    }
                                  });
                                }
                                
                                // 既存のデータと画像項目をマージ
                                const allImageItems = new Map<number, { item: any; results: { [date: string]: any } }>();
                                
                                // 既存のデータを追加
                                sortedItems.forEach(([itemIdStr, data]) => {
                                  const itemId = Number(itemIdStr);
                                  if (IMAGE_ITEMS.includes(data.item?.itemName || "")) {
                                    allImageItems.set(itemId, data);
                                  }
                                });
                                
                                // データがない画像項目も追加
                                imageItemIds.forEach(itemId => {
                                  if (!allImageItems.has(itemId)) {
                                    const item = testItems?.find(ti => ti.id === itemId);
                                    if (item) {
                                      allImageItems.set(itemId, { item, results: {} });
                                    }
                                  }
                                });
                                
                                return Array.from(allImageItems.entries())
                                  .sort(([, a], [, b]) => {
                                    const aName = a.item?.itemName || "";
                                    const bName = b.item?.itemName || "";
                                    const aIndex = IMAGE_ITEMS.indexOf(aName);
                                    const bIndex = IMAGE_ITEMS.indexOf(bName);
                                    if (aIndex === -1 && bIndex === -1) return 0;
                                    if (aIndex === -1) return 1;
                                    if (bIndex === -1) return -1;
                                    return aIndex - bIndex;
                                  })
                                  .map(([itemId, data]) => (
                                    <tr key={itemId} className="hover:bg-muted/20 transition-colors">
                                      <td className="sticky left-0 z-10 bg-background p-3 font-medium border-r min-w-[200px] whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                                        {data.item?.itemName || "-"}
                                      </td>
                                      {displayedDates.map((date) => {
                                        const hasImage = imageMap.has(`${itemId}-${date}`);
                                        return (
                                          <td 
                                            key={date} 
                                            className="p-3 text-center border-r cursor-pointer hover:bg-muted/30 transition-colors"
                                            onClick={() => {
                                              setSelectedImageItem({ itemId, date });
                                              setIsImageDialogOpen(true);
                                            }}
                                            title={hasImage ? "クリックして画像を確認・追加・削除" : "クリックして画像を追加"}
                                          >
                                            <div className="flex items-center justify-center">
                                              {hasImage ? (
                                                <span className="text-xs font-medium text-primary">画像あり</span>
                                              ) : (
                                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">画像データがありません</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 薬歴カレンダー */}
        <Card className="card-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>薬歴カレンダー</CardTitle>
              <Button onClick={() => setIsAddMedicationOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />薬歴登録
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {medicationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : medicationsError ? (
              <div className="text-center py-8">
                <p className="text-destructive">エラーが発生しました: {medicationsError.message}</p>
                <Button className="mt-4" onClick={() => refetchMedications()}>
                  再読み込み
                </Button>
              </div>
            ) : medications && medications.length > 0 ? (
              <MedicationCalendar medications={medications} />
            ) : (
              <p className="text-center text-muted-foreground py-8">薬歴データがありません</p>
            )}
          </CardContent>
        </Card>

        {/* 患者基本情報編集ダイアログ */}
        <Dialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdatePatient}>
              <DialogHeader>
                <DialogTitle>患者基本情報編集</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-patientId">患者ID *</Label>
                  <Input 
                    id="edit-patientId" 
                    name="patientId" 
                    type="text" 
                    defaultValue={patient.patientId}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">氏名 *</Label>
                  <Input 
                    id="edit-name" 
                    name="name" 
                    type="text" 
                    defaultValue={patient.name}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-nameKana">氏名（カナ）</Label>
                  <Input 
                    id="edit-nameKana" 
                    name="nameKana" 
                    type="text" 
                    defaultValue={patient.nameKana || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-gender">性別 *</Label>
                  <input type="hidden" name="gender" id="edit-gender-value" defaultValue={patient.gender} />
                  <Select 
                    defaultValue={patient.gender} 
                    onValueChange={(value) => {
                      const hiddenInput = document.getElementById('edit-gender-value') as HTMLInputElement;
                      if (hiddenInput) hiddenInput.value = value;
                    }}
                    required
                  >
                    <SelectTrigger id="edit-gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="男">男</SelectItem>
                      <SelectItem value="女">女</SelectItem>
                      <SelectItem value="その他">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-birthDate">生年月日 *</Label>
                  <Input 
                    id="edit-birthDate" 
                    name="birthDate" 
                    type="date" 
                    defaultValue={new Date(patient.birthDate).toISOString().split('T')[0]}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">電話番号</Label>
                  <Input 
                    id="edit-phone" 
                    name="phone" 
                    type="tel" 
                    defaultValue={patient.phone || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">メールアドレス</Label>
                  <Input 
                    id="edit-email" 
                    name="email" 
                    type="email" 
                    defaultValue={patient.email || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">住所</Label>
                  <Textarea 
                    id="edit-address" 
                    name="address" 
                    defaultValue={patient.address || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-doctorId">顧問医師 *</Label>
                  <input type="hidden" name="doctorId" id="edit-doctorId-value" defaultValue={String(patient.doctorId)} />
                  <Select 
                    defaultValue={String(patient.doctorId)}
                    onValueChange={(value) => {
                      const hiddenInput = document.getElementById('edit-doctorId-value') as HTMLInputElement;
                      if (hiddenInput) hiddenInput.value = value;
                    }}
                    required
                  >
                    <SelectTrigger id="edit-doctorId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors?.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">ステータス *</Label>
                  <input type="hidden" name="status" id="edit-status-value" defaultValue={patient.status || "新規"} />
                  <Select 
                    defaultValue={patient.status || "新規"}
                    onValueChange={(value) => {
                      const hiddenInput = document.getElementById('edit-status-value') as HTMLInputElement;
                      if (hiddenInput) hiddenInput.value = value;
                    }}
                    required
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="新規">新規</SelectItem>
                      <SelectItem value="契約中">契約中</SelectItem>
                      <SelectItem value="終了">終了</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">備考</Label>
                  <Textarea 
                    id="edit-notes" 
                    name="notes" 
                    defaultValue={patient.notes || ""}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditPatientOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={updatePatientMutation.isPending}>
                  {updatePatientMutation.isPending ? "更新中..." : "更新"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 検査結果編集ダイアログ */}
        <Dialog open={isEditResultOpen} onOpenChange={setIsEditResultOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdateResults}>
              <DialogHeader>
                <DialogTitle>検査結果編集 - {editingDate}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                {editingDate && allResults ? (() => {
                  if (!testItems) {
                    return <p className="text-center text-muted-foreground py-8">検査項目を読み込んでいます...</p>;
                  }

                  const dateParts = editingDate.split(".");
                  if (dateParts.length !== 3) {
                    return <p className="text-center text-muted-foreground py-8">日付の形式が正しくありません</p>;
                  }

                  // DBの日付と同じ粒度で比較（matrixで使用している "YYYY.MM.DD" 形式）
                  const formatDateForComparison = (date: Date | string) => {
                    const d = typeof date === "string" ? new Date(date) : date;
                    const y = d.getFullYear();
                    const m = d.getMonth() + 1;
                    const day = d.getDate();
                    return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
                  };

                  // 既存結果（この日付）のインデックス
                  const existingByItemId = new Map<number, any>();
                  allResults.forEach(r => {
                    if (categorizeItem(r.item?.itemName || "") !== "検査結果") return;
                    const resultDateStr = formatDateForComparison(r.result.testDate);
                    if (resultDateStr !== editingDate) return;
                    existingByItemId.set(r.result.itemId, r.result);
                  });

                  // 未入力も含めて全項目を編集対象にする（検査結果カテゴリのみ）
                  const editableItems = testItems
                    .filter(item => categorizeItem(item.itemName) === "検査結果")
                    .slice()
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                  // カテゴリ別にグループ化
                  const itemsByCategory = new Map<string, typeof editableItems>();
                  editableItems.forEach(item => {
                    const cat = item.category || "その他";
                    if (!itemsByCategory.has(cat)) itemsByCategory.set(cat, []);
                    itemsByCategory.get(cat)!.push(item);
                  });

                  const sortedCats = Array.from(itemsByCategory.keys()).sort((a, b) => a.localeCompare(b));

                  return (
                    <>
                      {sortedCats.map((cat) => (
                        <div key={cat} className="space-y-3">
                          <h3 className="text-lg font-semibold text-indigo-600">{cat}</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {(itemsByCategory.get(cat) || []).map((item) => {
                              const existing = existingByItemId.get(item.id);
                              const { refMin, refMax } = getReferenceValues(item);
                              return (
                                <div key={item.id} className="grid gap-1.5">
                                  <Label htmlFor={`item_${item.id}`} className="text-sm">
                                    {item.itemName} {item.unit && `(${item.unit})`}
                                    {refMin != null && refMax != null ? (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        基準値: {refMin}~{refMax}
                                      </span>
                                    ) : null}
                                  </Label>
                                  <Input
                                    id={`item_${item.id}`}
                                    name={`item_${item.id}`}
                                    type="text"
                                    defaultValue={existing?.resultValue != null ? String(existing.resultValue) : ""}
                                    placeholder={existing ? undefined : "未入力"}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })() : (
                  <p className="text-center text-muted-foreground py-8">データを読み込んでいます...</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditResultOpen(false);
                  setEditingDate(null);
                }}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={updateTestResultMutation.isPending}>
                  {updateTestResultMutation.isPending ? "更新中..." : "更新"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 薬歴登録ダイアログ */}
        <Dialog open={isAddMedicationOpen} onOpenChange={setIsAddMedicationOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              try {
                await createMedicationMutation.mutateAsync({
                  patientId,
                  medicationName: formData.get("medicationName") as string,
                  startDate: formData.get("startDate") as string,
                  endDate: formData.get("endDate") as string || undefined,
                  notes: formData.get("notes") as string || undefined,
                });
                toast.success("薬歴を登録しました");
                setIsAddMedicationOpen(false);
                refetchMedications();
                (e.target as HTMLFormElement).reset();
              } catch (error: any) {
                toast.error(error.message || "登録に失敗しました");
              }
            }}>
              <DialogHeader>
                <DialogTitle>薬歴登録</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="medicationName">薬剤名 *</Label>
                  <Input 
                    id="medicationName" 
                    name="medicationName" 
                    type="text" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="startDate">開始日 *</Label>
                  <Input 
                    id="startDate" 
                    name="startDate" 
                    type="date" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">終了日</Label>
                  <Input 
                    id="endDate" 
                    name="endDate" 
                    type="date" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">備考</Label>
                  <Textarea 
                    id="notes" 
                    name="notes" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddMedicationOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={createMedicationMutation.isPending}>
                  {createMedicationMutation.isPending ? "登録中..." : "登録"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddResultOpen} onOpenChange={(open) => {
          setIsAddResultOpen(open);
          if (!open) {
            setSelectedCategory(null);
          }
        }}>
          <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
            <form onSubmit={handleAddResult} className="flex flex-col h-full">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>検査結果一括登録</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4 flex-1 min-h-0">
                <div className="grid gap-2 flex-shrink-0">
                  <Label htmlFor="testDate">検査日 *</Label>
                  <Input id="testDate" name="testDate" type="date" required />
                </div>

                {/* カテゴリタブ */}
                {testItemsLoading ? (
                  <div className="flex items-center justify-center py-8 flex-1">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-muted-foreground">検査項目を読み込んでいます...</span>
                  </div>
                ) : testItemsError ? (
                  <div className="text-center py-8 flex-1">
                    <p className="text-destructive">検査項目の読み込みに失敗しました: {testItemsError.message}</p>
                  </div>
                ) : !testItems || testItems.length === 0 ? (
                  <div className="text-center py-8 flex-1">
                    <p className="text-muted-foreground">検査項目が登録されていません</p>
                  </div>
                ) : (() => {
                  const categoryOrder = [
                    "身体",
                    "脳・血管",
                    "肺機能",
                    "血圧",
                    "血液",
                    "脂質代謝",
                    "糖代謝",
                    "腎・尿路系",
                    "肝胆膵",
                    "内分泌",
                    "口腔",
                    "診察",
                    "循環器",
                    "呼吸器",
                    "消化器",
                    "生殖器",
                    "乳がん",
                    "腫瘍マーカー",
                    "感染症・免疫",
                  ];
                  
                  const sortedCategories = Array.from(new Set(testItems.map(item => item.category)))
                    .sort((a, b) => {
                      const indexA = categoryOrder.indexOf(a);
                      const indexB = categoryOrder.indexOf(b);
                      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                      if (indexA === -1) return 1;
                      if (indexB === -1) return -1;
                      return indexA - indexB;
                    })
                    .filter(cat => {
                      const categoryItems = testItems.filter(item => item.category === cat);
                      return categoryItems.length > 0;
                    });
                  
                  const defaultCategory = selectedCategory || sortedCategories[0] || "";
                  
                  return (
                    <Tabs 
                      value={defaultCategory} 
                      onValueChange={setSelectedCategory}
                      className="flex flex-col flex-1 min-h-0"
                    >
                      <TabsList className="flex-shrink-0 overflow-x-auto justify-start w-full">
                        {sortedCategories.map((cat) => (
                          <TabsTrigger key={cat} value={cat} className="whitespace-nowrap">
                            {cat}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {/* カテゴリ別に項目を表示 */}
                      {sortedCategories.map((cat) => {
                          const categoryItems = testItems?.filter(item => item.category === cat) || [];
                          if (categoryItems.length === 0) return null;
                          
                          return (
                            <TabsContent 
                              key={cat} 
                              value={cat} 
                              className="flex-1 overflow-y-auto mt-4 space-y-4"
                            >
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                  {categoryItems.map((item) => {
                                    const isImageItem = IMAGE_ITEMS.includes(item.itemName);
                                    
                                    return (
                                      <div key={item.id} className="grid gap-1.5">
                                        <Label htmlFor={isImageItem ? `image_${item.id}` : `item_${item.id}`} className="text-sm font-medium">
                                          {item.itemName}
                                          {item.unit && !isImageItem && (
                                            <span className="text-xs text-muted-foreground ml-1">({item.unit})</span>
                                          )}
                                        </Label>
                                        {(() => {
                                          if (isImageItem) return null;
                                          const { refMin, refMax } = getReferenceValues(item);
                                          if (refMin != null && refMax != null) {
                                            return (
                                              <p className="text-xs text-muted-foreground">
                                                基準値: {refMin}~{refMax}
                                              </p>
                                            );
                                          }
                                          return null;
                                        })()}
                                        {isImageItem ? (
                                          <div className="space-y-2">
                                            <Input
                                              id={`image_${item.id}`}
                                              name={`image_${item.id}`}
                                              type="file"
                                              accept="image/*"
                                              multiple
                                              className="cursor-pointer text-xs"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                              複数枚の画像を選択できます
                                            </p>
                                          </div>
                                        ) : (
                                          <Input 
                                            id={`item_${item.id}`} 
                                            name={`item_${item.id}`} 
                                            type="text" 
                                            placeholder="値を入力" 
                                            className="text-sm"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </TabsContent>
                          );
                        }).filter(Boolean)}
                    </Tabs>
                  );
                })()}

                <p className="text-xs text-muted-foreground flex-shrink-0">
                  ※ 入力した項目のみが登録されます。空欄の項目は登録されません。
                </p>
              </div>
              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddResultOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={createTestResultMutation.isPending}>
                  {createTestResultMutation.isPending ? "登録中..." : "一括登録"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 画像管理ダイアログ */}
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedImageItem && sortedItems.find(([id]) => Number(id) === selectedImageItem.itemId)?.[1]?.item?.itemName} - {selectedImageItem?.date}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 画像一覧 */}
              {images && images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="relative group border rounded-lg overflow-hidden">
                      <img
                        src={image.imageUrl}
                        alt={image.fileName || "画像"}
                        crossOrigin="use-credentials"
                        className="w-full h-64 object-contain bg-muted"
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            if (confirm("この画像を削除しますか？")) {
                              try {
                                await deleteImageMutation.mutateAsync({ id: image.id });
                                toast.success("画像を削除しました");
                                // 画像一覧/マトリクス（全件）を確実に更新する
                                await utils.testResultImages.list.invalidate();
                                refetchImages();
                              } catch (error: any) {
                                toast.error(error.message || "削除に失敗しました");
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-2 bg-background/80 backdrop-blur-sm">
                        <p className="text-xs text-muted-foreground truncate">
                          {image.fileName || "画像"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">画像がありません</p>
              )}

              {/* 画像アップロード */}
              <div className="border-t pt-4">
                <Label htmlFor="imageUpload" className="text-sm font-semibold mb-2 block">
                  画像を追加
                </Label>
                <Input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedImageItem) return;

                    try {
                      // ファイルをbase64に変換
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const base64Data = reader.result as string;
                        try {
                          await uploadImageMutation.mutateAsync({
                            patientId,
                            itemId: selectedImageItem.itemId,
                            testDate: selectedImageItem.date.replace(/\./g, "-"),
                            fileData: base64Data,
                            fileName: file.name,
                            mimeType: file.type,
                          });
                          toast.success("画像をアップロードしました");
                          // 画像一覧/マトリクス（全件）を確実に更新する
                          await utils.testResultImages.list.invalidate();
                          refetchImages();
                          // ファイル入力をリセット
                          e.target.value = "";
                        } catch (error: any) {
                          toast.error(error.message || "アップロードに失敗しました");
                        }
                      };
                      reader.readAsDataURL(file);
                    } catch (error: any) {
                      toast.error(error.message || "画像の読み込みに失敗しました");
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  画像ファイルを選択してアップロードしてください
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsImageDialogOpen(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
