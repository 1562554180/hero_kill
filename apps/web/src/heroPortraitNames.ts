/**
 * 中文件名 → heroId 映射. 用于自动加载 images/*.jpg 立绘 + 头像小图.
 * 新增英雄时只需在此追加一行, 各页面 (HeroPortrait/HeroPage/BackpackPage/BattlePage/HeroStoneIcon) 自动生效.
 */
export const HERO_NAME_TO_ID: Record<string, string> = {
  '扁鹊': 'bian-que', '曹操': 'cao-cao', '陈胜': 'chen-sheng', '程咬金': 'cheng-yao-jin',
  '勾践': 'gou-jian', '关羽': 'guan-yu', '韩信': 'han-xin', '荆轲': 'jing-ke',
  '李逵': 'li-kui', '李世民': 'li-shi-min', '李师师': 'li-shi-shi', '李煜': 'li-yu',
  '廉颇': 'lian-po', '刘邦': 'liu-bang', '吕雉': 'lv-zhi', '慕容': 'mu-rong', '秦琼': 'qin-qiong',
  '商鞅': 'shang-yang', '宋江': 'song-jiang', '澹台名': 'tan-tai-ming', '铁木真': 'tie-mu-zhen',
  '时迁': 'shi-qian',
  '武松': 'wu-song', '武则天': 'wu-ze-tian', '项羽': 'xiang-yu', '小乔': 'xiao-qiao',
  '杨延昭': 'yang-yan-zhao', '嬴政': 'ying-zheng', '虞姬': 'yu-ji',
  '岳飞': 'yue-fei', '赵匡胤': 'zhao-kuang-yin', '朱元璋': 'zhu-yuan-zhang', '诸葛亮': 'zhuge-liang',
  '吴三桂': 'wu-san-gui', '宇文化及': 'yu-wen-hua-ji', '孟获': 'meng-huo',
  '萧太后': 'xiao-tai-hou', '兰陵王': 'lan-ling-wang',
  '包拯': 'bao-zheng', '东方朔': 'dong-fang-suo', '张三丰': 'zhang-san-feng', '妲己': 'da-ji',
}
