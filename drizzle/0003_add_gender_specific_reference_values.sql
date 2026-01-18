-- 性別別の基準値フィールドを追加
ALTER TABLE `testItems` 
  ADD COLUMN `referenceMinMale` DECIMAL(10,2) NULL COMMENT '男性基準値下限',
  ADD COLUMN `referenceMaxMale` DECIMAL(10,2) NULL COMMENT '男性基準値上限',
  ADD COLUMN `referenceMinFemale` DECIMAL(10,2) NULL COMMENT '女性基準値下限',
  ADD COLUMN `referenceMaxFemale` DECIMAL(10,2) NULL COMMENT '女性基準値上限';

